import { Hono } from "hono";
import { z } from "zod";
import { getDB, getKV } from "../db/index.js";
import { LoginSchema, RegisterSchema } from "../schemas/auth.js";
import { validateApiKey } from "../middlewares/auth.js";
import { UserRow, PlanRow, AppEnv } from "../types.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const auth = new Hono<AppEnv>();

auth.post("/login", async (c) => {
  const db = getDB(c);
  const kvInstance = getKV(c);
  const body = await c.req.json();
  const validation = LoginSchema.safeParse(body);
  if (!validation.success) return c.json({ error: "Invalid input format" }, 400);
  
  const { username, password } = validation.data;
  const user = await db.get<UserRow>("SELECT * FROM users WHERE username = ?", [username]);
  
  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    return c.json({ error: "Account temporarily locked. Try again later." }, 423);
  }

  const isValid = await verifyPassword(password, user.password);
  
  if (isValid) {
    await db.run("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?", [user.id]);
    const sessionToken = crypto.randomUUID().replace(/-/g, '');
    const sessionData = { token: sessionToken, user_id: user.id, last_activity: new Date().toISOString() };
    
    await db.run("INSERT INTO sessions (token, user_id, last_activity) VALUES (?, ?, ?)", [sessionToken, user.id, sessionData.last_activity]);
    
    if (kvInstance) await kvInstance.put(sessionToken, JSON.stringify(sessionData), { expirationTtl: 3600 });
    
    const plan = await db.get<PlanRow>("SELECT * FROM plans WHERE id = ?", [user.plan_id]);
    
    return c.json({ 
      id: user.id, 
      username: user.username, 
      api_key: user.api_key, 
      is_admin: user.is_admin,
      session_token: sessionToken,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        request_limit: plan.request_limit,
        request_count: user.request_count,
        features: JSON.parse(plan.features)
      } : null
    });
  } else {
    const attempts = user.failed_attempts + 1;
    let lockUntil = null;
    if (attempts >= 5) lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.run("UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?", [attempts, lockUntil, user.id]);
    return c.json({ error: "Invalid credentials" }, 401);
  }
});

auth.post("/register", async (c) => {
  const db = getDB(c);
  const body = await c.req.json();
  const validation = RegisterSchema.safeParse(body);
  if (!validation.success) return c.json({ error: validation.error.issues[0].message }, 400);
  
  const { username, fullName, email, password } = validation.data;
  const hashedPassword = await hashPassword(password);
  const apiKey = `loki_${crypto.randomUUID().replace(/-/g, '')}`;
  
  const userCountResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users");
  const isAdmin = (userCountResult?.count || 0) === 0 ? 1 : 0;
  
  const freePlan = await db.get<PlanRow>("SELECT id FROM plans WHERE name = 'Free'");
  const planId = freePlan?.id || 1;

  try {
    const info = await db.run("INSERT INTO users (username, full_name, email, password, api_key, is_admin, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      username, fullName, email, hashedPassword, apiKey, isAdmin, planId
    ]);
    return c.json({ id: info.lastInsertRowid, username, apiKey, is_admin: isAdmin });
  } catch (e: any) {
    console.error("[AUTH] Registration error:", e);
    const errorMsg = e.message || String(e);
    if (errorMsg.includes('UNIQUE') || errorMsg.includes('already exists')) {
      if (errorMsg.includes('username')) return c.json({ error: "Username already taken" }, 400);
      if (errorMsg.includes('email')) return c.json({ error: "Email already registered" }, 400);
      return c.json({ error: "User or Email already exists" }, 400);
    }
    return c.json({ error: `Registration failed: ${errorMsg}` }, 500);
  }
});

auth.get("/me", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const user = await db.get<UserRow>("SELECT id, username, api_key, is_admin FROM users WHERE id = ?", [userId]);
  return c.json(user);
});

auth.get("/keys", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const keys = await db.query("SELECT * FROM api_keys WHERE user_id = ?", [userId]);
  return c.json(keys);
});

auth.post("/keys", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const body = await c.req.json();
  const { name } = body;
  
  const user = await db.get<UserRow>("SELECT is_admin FROM users WHERE id = ?", [userId]);
  const keyCountResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?", [userId]);
  const keyCount = keyCountResult?.count || 0;
  
  let limit = 1; // Free
  
  if (keyCount >= limit && user?.is_admin !== 1) {
    return c.json({ error: `Plan limit reached: ${limit} key(s) allowed.` }, 403);
  }

  const newKey = `loki_${crypto.randomUUID().replace(/-/g, '')}`;
  const result = await db.run("INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)", [userId, newKey, name || "New Key"]);
  return c.json({ id: result.lastInsertRowid, key: newKey, name: name || "New Key" });
});

auth.delete("/keys/:id", validateApiKey, async (c) => {
  const db = getDB(c);
  const id = c.req.param('id');
  const userId = c.get('userId');
  await db.run("DELETE FROM api_keys WHERE id = ? AND user_id = ?", [id, userId]);
  return c.json({ success: true });
});

auth.put("/profile", validateApiKey, async (c) => {
  const db = getDB(c);
  const userId = c.get('userId');
  const body = await c.req.json();
  const { fullName, email } = body;
  try {
    await db.run("UPDATE users SET full_name = ?, email = ? WHERE id = ?", [fullName, email, userId]);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default auth;
