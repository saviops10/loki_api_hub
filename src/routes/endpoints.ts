import { Hono } from "hono";
import { db } from "../db/index.js";
import { EndpointSchema } from "../schemas/endpoint.js";
import { validateApiKey, checkOwnership } from "../middlewares/auth.js";
import { EndpointRow, AppEnv } from "../types.js";

const endpoints = new Hono<AppEnv>();

endpoints.get("/:apiId", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const apiId = Number(c.req.param('apiId'));
  if (!await checkOwnership('apis', apiId, userId)) return c.json({ error: "Access denied" }, 403);
  
  const eps = await db.query<EndpointRow>("SELECT * FROM endpoints WHERE api_id = ?", [apiId]);
  return c.json(eps);
});

endpoints.post("/", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const validation = EndpointSchema.safeParse(body);
  if (!validation.success) return c.json({ error: "Invalid endpoint configuration" }, 400);
  
  const { apiId, name, path, method, isFavorite, groupName } = validation.data;
  if (!await checkOwnership('apis', Number(apiId), userId)) return c.json({ error: "Access denied" }, 403);

  const info = await db.run("INSERT INTO endpoints (api_id, name, path, method, is_favorite, group_name) VALUES (?, ?, ?, ?, ?, ?)", 
    [Number(apiId), name, path, method, isFavorite ? 1 : 0, groupName || 'Default']);
  
  return c.json({ id: info.lastInsertRowid });
});

endpoints.put("/:id", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership('endpoints', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  const body = await c.req.json();
  const validation = EndpointSchema.safeParse(body);
  if (!validation.success) return c.json({ error: "Invalid endpoint configuration" }, 400);
  
  const { name, path, method, isFavorite, groupName } = validation.data;
  await db.run("UPDATE endpoints SET name = ?, path = ?, method = ?, is_favorite = ?, group_name = ? WHERE id = ?", 
    [name, path, method, isFavorite ? 1 : 0, groupName || 'Default', id]);
  
  return c.json({ success: true });
});

endpoints.get("/:id/logs", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership('endpoints', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  const logs = await db.query("SELECT * FROM logs WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 10", [id]);
  return c.json(logs);
});

endpoints.delete("/:id", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership('endpoints', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  await db.run("DELETE FROM logs WHERE endpoint_id = ?", [id]);
  await db.run("DELETE FROM endpoints WHERE id = ?", [id]);
  return c.json({ success: true });
});

endpoints.post("/:id/duplicate", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership('endpoints', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  const ep = await db.get<EndpointRow>("SELECT * FROM endpoints WHERE id = ?", [id]);
  if (!ep) return c.json({ error: "Endpoint not found" }, 404);

  const result = await db.run(`
    INSERT INTO endpoints (api_id, name, path, method, group_name, is_favorite)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [ep.api_id, `${ep.name} (Copy)`, ep.path, ep.method, ep.group_name, ep.is_favorite]);

  return c.json({ id: result.lastInsertRowid });
});

endpoints.delete("/:id/logs", validateApiKey, async (c) => {
  const userId = c.get('userId');
  const id = Number(c.req.param('id'));
  if (!await checkOwnership('endpoints', id, userId)) return c.json({ error: "Access denied" }, 403);
  
  await db.run("DELETE FROM logs WHERE endpoint_id = ?", [id]);
  return c.json({ success: true });
});

export default endpoints;
