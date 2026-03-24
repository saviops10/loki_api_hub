import { Hono } from "hono";
import { getDB, getR2 } from "../db/index.js";
import { ApiSchema } from "../schemas/api.js";
import { validateApiKey, checkOwnership } from "../middlewares/auth.js";
import { ApiRow, EndpointRow, AppEnv } from "../types.js";
import { encrypt, decrypt } from "../utils/security.js";
import { refreshApiToken } from "../services/apiService.js";

const apis = new Hono<AppEnv>();

apis.get("/", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const apis = await db.query<ApiRow>("SELECT * FROM apis WHERE user_id = ?", [userId]);
  return c.json(apis);
});

apis.post("/", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const body = await c.req.json();
  const validation = ApiSchema.safeParse(body);
  if (!validation.success) return c.json({ error: "Invalid API configuration" }, 400);
  
  const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate } = validation.data;
  const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl.replace(/\/+$/, '') : `https://${baseUrl.replace(/\/+$/, '')}`;
  const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
  
  const info = await db.run("INSERT INTO apis (user_id, name, base_url, auth_type, auth_config, auth_endpoint, auth_username, auth_password, auth_payload_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
    [userId, name, normalizedBaseUrl, authType || 'none', encryptedConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate]);
  
  const apiId = Number(info.lastInsertRowid);
  if (authEndpoint) refreshApiToken(db, apiId).catch(console.error);
  
  return c.json({ id: apiId });
});

apis.delete("/:id", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership(db, 'apis', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  await db.run("DELETE FROM endpoints WHERE api_id = ?", [id]);
  await db.run("DELETE FROM apis WHERE id = ?", [id]);
  return c.json({ success: true });
});

apis.post("/:id/refresh-token", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership(db, 'apis', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  const token = await refreshApiToken(db, id);
  if (token) return c.json({ token });
  return c.json({ error: "Failed to refresh token" }, 500);
});

apis.get("/export/:userId", validateApiKey, async (c) => {
  const db = getDB(c);
  const r2Instance = getR2(c);
  const userId = c.get('userId');
  const paramUserId = Number(c.req.param('userId'));
  if (userId !== paramUserId) return c.json({ error: "Access denied" }, 403);
  
  const userApis = await db.query<ApiRow>("SELECT * FROM apis WHERE user_id = ?", [userId]);
  if (userApis.length === 0) return c.json({ message: "No data to export", data: [] });

  const apiIds = userApis.map(api => api.id);
  const placeholders = apiIds.map(() => "?").join(",");
  const allEndpoints = await db.query<EndpointRow>(`SELECT * FROM endpoints WHERE api_id IN (${placeholders})`, apiIds);

  const endpointsByApiId = allEndpoints.reduce((acc, ep) => {
    if (!acc[ep.api_id]) acc[ep.api_id] = [];
    acc[ep.api_id].push(ep);
    return acc;
  }, {} as Record<number, any[]>);

  const data = userApis.map(api => ({
    ...api,
    auth_config: JSON.parse(decrypt(api.auth_config)),
    endpoints: endpointsByApiId[api.id] || []
  }));

  const fileName = `export_user_${userId}_${Date.now()}.json`;
  const dataStr = JSON.stringify(data, null, 2);
  
  if (r2Instance) {
    try {
      await r2Instance.put(fileName, dataStr);
    } catch (err) {
      console.error("[EXPORT] Failed to save to R2:", err);
    }
  }

  return c.json({ message: "Data exported successfully", fileName, data });
});

apis.get("/:id/stats", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership(db, 'apis', id, userId)) return c.json({ error: "Access denied" }, 403);

  const logs = await db.query(`
    SELECT l.*, e.name as endpoint_name 
    FROM logs l
    JOIN endpoints e ON l.endpoint_id = e.id
    WHERE e.api_id = ?
    ORDER BY l.timestamp DESC
    LIMIT 100
  `, [id]) as any[];

  if (logs.length === 0) {
    return c.json({
      stats: { total: 0, successRate: 0, avgLatency: 0, maxLatency: 0 },
      latencyData: [],
      errorDistribution: []
    });
  }

  const total = logs.length;
  const success = logs.filter(l => Number(l.status) >= 200 && Number(l.status) < 300).length;
  const successRate = Math.round((success / total) * 100);
  const latencies = logs.map(l => Number(l.latency) || 0).filter(l => l > 0);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

  const latencyData = logs.slice(0, 20).reverse().map(l => ({
    time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: Number(l.latency) || 0
  }));

  const errorCounts: Record<string, number> = {};
  logs.forEach(l => {
    const code = String(l.status);
    errorCounts[code] = (errorCounts[code] || 0) + 1;
  });

  const errorDistribution = Object.entries(errorCounts).map(([name, value]) => ({
    name: `HTTP ${name}`,
    value
  }));

  return c.json({
    stats: { total, successRate, avgLatency, maxLatency },
    latencyData,
    errorDistribution
  });
});

export default apis;
