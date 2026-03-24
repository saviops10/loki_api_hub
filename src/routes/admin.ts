import { Hono } from "hono";
import { getDB, getStatus, getKV } from "../db/index.js";
import { adminMiddleware } from "../middlewares/auth.js";
import { UserRow, PlanRow, ApiRow, AppEnv } from "../types.js";

const admin = new Hono<AppEnv>();

admin.get("/users", adminMiddleware, async (c) => {
  const db = getDB(c);
  const users = await db.query(`
    SELECT u.id, u.username, u.full_name, u.email, u.is_admin, u.request_count, p.name as plan_name 
    FROM users u 
    LEFT JOIN plans p ON u.plan_id = p.id
  `);
  return c.json(users);
});

admin.get("/plans", adminMiddleware, async (c) => {
  const db = getDB(c);
  const plans = await db.query("SELECT * FROM plans");
  return c.json(plans);
});

admin.post("/plans", adminMiddleware, async (c) => {
  const db = getDB(c);
  const body = await c.req.json();
  const { name, request_limit, max_apis, max_endpoints, features, price } = body;
  try {
    const result = await db.run(`
      INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, request_limit, max_apis, max_endpoints, JSON.stringify(features), price]);
    return c.json({ id: result.lastInsertRowid });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

admin.put("/plans/:id", adminMiddleware, async (c) => {
  const db = getDB(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, request_limit, max_apis, max_endpoints, features, price } = body;
  try {
    await db.run(`
      UPDATE plans 
      SET name = ?, request_limit = ?, max_apis = ?, max_endpoints = ?, features = ?, price = ?
      WHERE id = ?
    `, [name, request_limit, max_apis, max_endpoints, JSON.stringify(features), price, id]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

admin.delete("/plans/:id", adminMiddleware, async (c) => {
  const db = getDB(c);
  const id = c.req.param('id');
  try {
    await db.run("DELETE FROM plans WHERE id = ?", [id]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

admin.get("/apis", adminMiddleware, async (c) => {
  const db = getDB(c);
  const apis = await db.query(`
    SELECT a.*, u.username as owner_name 
    FROM apis a 
    JOIN users u ON a.user_id = u.id
  `);
  return c.json(apis);
});

admin.post("/users/:id/toggle-admin", adminMiddleware, async (c) => {
  const db = getDB(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const { isAdmin } = body;
  await db.run("UPDATE users SET is_admin = ? WHERE id = ?", [isAdmin ? 1 : 0, id]);
  return c.json({ success: true });
});

admin.get("/system-status", adminMiddleware, async (c) => {
  const dbStatus = getStatus(c);
  const status = {
    d1: {
      status: dbStatus.database !== "Not Initialized" ? "Connected" : "Disconnected",
      usage: "Managed by Cloudflare",
      percentage: 0
    },
    kv: {
      status: dbStatus.kv.includes("Active") ? "Active" : "Inactive",
      keys: "Managed by Cloudflare",
      percentage: 0
    },
    r2: {
      status: dbStatus.r2.includes("Active") ? "Ready" : "Not Configured",
      buckets: "Managed by Cloudflare",
      percentage: 0
    },
    circuitBreakers: []
  };
  return c.json(status);
});

admin.post("/circuit/reset", adminMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { apiId } = body;
  const kvInstance = getKV(c);
  
  if (apiId) {
    if (kvInstance) {
      await kvInstance.delete(`circuit:${apiId}`);
    }
    return c.json({ success: true, message: `Circuit for API ${apiId} reset.` });
  } else {
    return c.json({ success: false, message: "Individual API ID required for reset." }, 400);
  }
});

export default admin;
