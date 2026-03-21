import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { initDB, getDB, getKV, getR2, db, kv, r2, getStatus } from "./src/db/index.js";

// Schemas
import { LoginSchema, RegisterSchema } from "./src/schemas/auth.js";
import { ApiSchema } from "./src/schemas/api.js";
import { EndpointSchema } from "./src/schemas/endpoint.js";

// Middlewares
import { validateApiKey, checkOwnership, adminMiddleware } from "./src/middlewares/auth.js";
import { rateLimitMiddleware } from "./src/middlewares/rateLimit.js";

// Utils
import { encrypt, decrypt, scrubData, globalErrorHandler } from "./src/utils/security.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Circuit Breaker State
const circuitBreakers: Record<number, { failures: number, lastFailure: number, status: 'OPEN' | 'CLOSED' | 'HALF_OPEN' }> = {};
const FAILURE_THRESHOLD = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

function checkCircuitBreaker(apiId: number): boolean {
  const cb = circuitBreakers[apiId];
  if (!cb || cb.status === 'CLOSED') return true;

  if (cb.status === 'OPEN') {
    if (Date.now() - cb.lastFailure > COOLDOWN_PERIOD) {
      cb.status = 'HALF_OPEN';
      console.log(`[CIRCUIT] API ${apiId} entering HALF_OPEN state.`);
      return true;
    }
    return false;
  }
  return true; // HALF_OPEN allows one request
}

function recordApiSuccess(apiId: number) {
  if (circuitBreakers[apiId]) {
    circuitBreakers[apiId] = { failures: 0, lastFailure: 0, status: 'CLOSED' };
  }
}

function recordApiFailure(apiId: number) {
  if (!circuitBreakers[apiId]) {
    circuitBreakers[apiId] = { failures: 1, lastFailure: Date.now(), status: 'CLOSED' };
  } else {
    circuitBreakers[apiId].failures += 1;
    circuitBreakers[apiId].lastFailure = Date.now();
    if (circuitBreakers[apiId].failures >= FAILURE_THRESHOLD) {
      circuitBreakers[apiId].status = 'OPEN';
      console.warn(`[CIRCUIT] API ${apiId} circuit OPENED due to ${FAILURE_THRESHOLD} failures.`);
    }
  }
}



async function initDatabase() {
  // Initialize Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      request_limit INTEGER,
      max_apis INTEGER,
      max_endpoints INTEGER,
      features TEXT,
      price TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      full_name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      api_key TEXT UNIQUE,
      is_admin INTEGER DEFAULT 0,
      failed_attempts INTEGER DEFAULT 0,
      lock_until DATETIME,
      plan_id INTEGER,
      request_count INTEGER DEFAULT 0,
      last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(plan_id) REFERENCES plans(id)
    );
  `);

  // Migration: Ensure new columns exist in users table
  const tableInfo = await db.query("PRAGMA table_info(users)");
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('full_name')) await db.exec("ALTER TABLE users ADD COLUMN full_name TEXT");
  if (!columns.includes('email')) await db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  if (!columns.includes('is_admin')) await db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
  if (!columns.includes('failed_attempts')) await db.exec("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0");
  if (!columns.includes('lock_until')) await db.exec("ALTER TABLE users ADD COLUMN lock_until DATETIME");
  if (!columns.includes('plan_id')) await db.exec("ALTER TABLE users ADD COLUMN plan_id INTEGER REFERENCES plans(id)");
  if (!columns.includes('request_count')) await db.exec("ALTER TABLE users ADD COLUMN request_count INTEGER DEFAULT 0");
  if (!columns.includes('last_reset_date')) await db.exec("ALTER TABLE users ADD COLUMN last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP");

  // Seed default plans if they don't exist
  const planCount = await db.get("SELECT COUNT(*) as count FROM plans") as any;
  if (planCount.count === 0) {
    await db.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Free', 1000, 5, 20, JSON.stringify(['Até 5 integrações ativas.', 'Painel básico.', 'Ambiente sandbox.', 'Logs limitados.']), 'R$ 0']);
    await db.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Business', 100000, 100, 1000, JSON.stringify(['Integrações ilimitadas.', 'Automação avançada.', 'Logs ampliados.', 'Suporte prioritário.']), 'Sob consulta']);
    await db.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Custom', 1000000, 1000, 10000, JSON.stringify(['Arquitetura personalizada.', 'SLAs dedicados.', 'Governança multi-times.', 'Consultoria.']), 'Sob medida']);
  }

  // Assign 'Free' plan to existing users who don't have one
  await db.exec("UPDATE users SET plan_id = (SELECT id FROM plans WHERE name = 'Free') WHERE plan_id IS NULL");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      key TEXT UNIQUE,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      base_url TEXT,
      auth_type TEXT,
      auth_config TEXT,
      auth_endpoint TEXT,
      auth_username TEXT,
      auth_password TEXT,
      auth_payload_template TEXT,
      token TEXT,
      token_expires_at DATETIME,
      last_refresh DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_id INTEGER,
      name TEXT,
      path TEXT,
      method TEXT,
      group_name TEXT DEFAULT 'Default',
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY(api_id) REFERENCES apis(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id INTEGER,
      status INTEGER,
      response_body TEXT,
      latency INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(endpoint_id) REFERENCES endpoints(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Migration: Ensure new columns exist
  const ensureColumns = async () => {
    const tables = {
      apis: ['auth_endpoint', 'auth_username', 'auth_password', 'auth_payload_template', 'token', 'token_expires_at', 'last_refresh'],
      endpoints: ['group_name'],
      users: ['failed_attempts', 'lock_until', 'api_key', 'full_name', 'email', 'is_admin'],
      logs: ['latency']
    };

    const allowedTables = ['apis', 'endpoints', 'users', 'logs'];

    for (const [table, columns] of Object.entries(tables)) {
      if (!allowedTables.includes(table)) continue;
      
      // Use parameterized query for table info if possible, but PRAGMA usually doesn't support it.
      // Since we use an allowlist, it's safe.
      const info = await db.query(`PRAGMA table_info(${table})`);
      const existingColumns = info.map(c => c.name);
      
      for (const col of columns) {
        if (!existingColumns.includes(col)) {
          console.log(`Adding column ${col} to table ${table}`);
          // Column names are also from our static map, so safe.
          await db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`);
        }
      }
    }
  };
  await ensureColumns();

  // Seed Test User
  const seedUser = async () => {
    const user = await db.get("SELECT * FROM users WHERE username = ?", ["admin"]) as any;
    const hashedPassword = await bcrypt.hash("root123!", 10);
    const apiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
    
    if (!user) {
      await db.run("INSERT INTO users (username, full_name, email, password, api_key, is_admin) VALUES (?, ?, ?, ?, ?, ?)", ["admin", "System Administrator", "admin@loki.hub", hashedPassword, apiKey, 1]);
      console.log("Test user 'admin' created.");
    } else {
      // Ensure admin has is_admin = 1
      if (user.is_admin !== 1) {
        await db.run("UPDATE users SET is_admin = 1 WHERE username = ?", ["admin"]);
      }
      // Update existing user to use bcrypt if needed
      if (!user.password.startsWith('$2a$')) {
        await db.run("UPDATE users SET password = ? WHERE username = ?", [hashedPassword, "admin"]);
        console.log("Test user 'admin' password migrated to bcrypt.");
      }
    }
  };
  await seedUser();
}

app.use(express.json());

// Cloudflare Environment Middleware
app.use(async (req, res, next) => {
  const env = (req as any).env || (globalThis as any);
  try {
    await initDB(env);
  } catch (e) {
    console.error("Database initialization error in middleware:", e);
  }
  next();
});

app.use(rateLimitMiddleware);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;");
  next();
});

// Removed moved logic (Encryption, Scrubbing, Schemas, Middlewares)

// API Routes
app.get("/api/health", async (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/status", async (req, res) => {
  try {
    const status = getStatus();
    let dbPing = "Unknown";
    try {
      await db.get("SELECT 1");
      dbPing = "Connected";
    } catch (e: any) {
      dbPing = `Error: ${e.message}`;
    }

    res.json({
      status: "ok",
      environment: process.env.NODE_ENV,
      adapters: {
        ...status,
        dbConnection: dbPing
      },
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Removed moved middlewares

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  const validation = LoginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Invalid input format", details: validation.error.format() });
  }
  const { username, password } = validation.data;
  console.log(`[AUTH] Login attempt for: ${username}`);
  const user = await db.get("SELECT * FROM users WHERE username = ?", [username]) as any;
  
  if (!user) {
    console.warn(`[AUTH] Login failure: User not found (${username})`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check lock
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    console.warn(`[AUTH] Login failure: Account locked (${username})`);
    return res.status(423).json({ error: "Account temporarily locked. Try again later." });
  }

  const isValid = await bcrypt.compare(password, user.password);
  
  if (isValid) {
    console.log(`[AUTH] Login success: ${username}`);
    await db.run("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?", [user.id]);
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionData = { token: sessionToken, user_id: user.id, last_activity: new Date().toISOString() };
    
    await db.run("INSERT INTO sessions (token, user_id, last_activity) VALUES (?, ?, ?)", [sessionToken, user.id, sessionData.last_activity]);
    
    const kvInstance = getKV();
    if (kvInstance) {
      try {
        await kvInstance.put(sessionToken, JSON.stringify(sessionData), { expirationTtl: 3600 });
      } catch (e) {
        console.warn("[AUTH] Failed to store session in KV:", e);
      }
    }
    
    const plan = await db.get("SELECT * FROM plans WHERE id = ?", [user.plan_id]) as any;
    
    res.json({ 
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
    console.warn(`[AUTH] Login failure: Invalid password (${username})`);
    const attempts = user.failed_attempts + 1;
    let lockUntil = null;
    if (attempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
      console.warn(`[AUTH] Account locked due to multiple failures: ${username}`);
    }
    await db.run("UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?", [attempts, lockUntil, user.id]);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const validation = RegisterSchema.safeParse(req.body);
    if (!validation.success) {
      console.warn(`[AUTH] Registration validation failed: ${JSON.stringify(validation.error.issues)}`);
      return res.status(400).json({ 
        error: validation.error.issues[0].message
      });
    }
    const { username, fullName, email, password } = validation.data;
    console.log(`[AUTH] Registration attempt for: ${username} (${email})`);

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
    
    // Check if this is the first user
    const userCountResult = await db.get("SELECT COUNT(*) as count FROM users") as any;
    const userCount = userCountResult.count;
    const isAdmin = userCount === 0 ? 1 : 0;
    
    // Ensure plans exist and get Free plan
    let freePlan = await db.get("SELECT id FROM plans WHERE name = 'Free'") as any;
    if (!freePlan) {
      console.log("[AUTH] Free plan not found, seeding default plans...");
      try {
        await db.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Free', 1000, 5, 20, JSON.stringify(['Até 5 integrações ativas.', 'Painel básico.', 'Ambiente sandbox.', 'Logs limitados.']), 'R$ 0']);
        freePlan = await db.get("SELECT id FROM plans WHERE name = 'Free'") as any;
      } catch (planErr: any) {
        console.error("[AUTH] Failed to seed Free plan:", planErr.message);
      }
    }

    const planId = freePlan?.id || 1;
    console.log(`[AUTH] Assigning Plan ID: ${planId} to user ${username}`);

    const info = await db.run("INSERT INTO users (username, full_name, email, password, api_key, is_admin, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      username, 
      fullName, 
      email, 
      hashedPassword, 
      apiKey, 
      isAdmin, 
      planId
    ]);
    
    console.log(`[AUTH] Registration success: ${username}. ID: ${info.lastInsertRowid}`);
    res.json({ id: info.lastInsertRowid, username, apiKey, is_admin: isAdmin });
  } catch (e: any) {
    console.error(`[AUTH] Registration error:`, e);
    if (e.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: "Email already exists" });
    }
    if (e.message.includes('UNIQUE constraint failed: users.username')) {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Registration failed", details: e.message });
  }
});

app.delete("/api/auth/account", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  try {
    console.log(`[AUTH] Deleting account for User ${userId}`);
    
    // Use db.batch for atomic deletion across all related tables
    await db.batch([
      // 1. Delete Logs
      {
        sql: `
          DELETE FROM logs 
          WHERE endpoint_id IN (
            SELECT e.id FROM endpoints e
            JOIN apis a ON e.api_id = a.id
            WHERE a.user_id = ?
          )
        `,
        params: [userId]
      },
      // 2. Delete Endpoints
      {
        sql: `
          DELETE FROM endpoints 
          WHERE api_id IN (
            SELECT id FROM apis WHERE user_id = ?
          )
        `,
        params: [userId]
      },
      // 3. Delete APIs
      {
        sql: "DELETE FROM apis WHERE user_id = ?",
        params: [userId]
      },
      // 4. Delete API Keys
      {
        sql: "DELETE FROM api_keys WHERE user_id = ?",
        params: [userId]
      },
      // 5. Delete Sessions
      {
        sql: "DELETE FROM sessions WHERE user_id = ?",
        params: [userId]
      },
      // 6. Delete User
      {
        sql: "DELETE FROM users WHERE id = ?",
        params: [userId]
      }
    ]);
    
    console.log(`[AUTH] Account and all related data deleted atomically for User ${userId}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[AUTH] Failed to delete account for User ${userId}:`, error);
    res.status(500).json({ error: "Failed to delete account. Please contact support." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const sessionToken = req.headers['x-loki-session-token'] as string;
  if (sessionToken) {
    await db.run("DELETE FROM sessions WHERE token = ?", [sessionToken]);
    const kvInstance = getKV();
    if (kvInstance) {
      try {
        await kvInstance.delete(sessionToken);
      } catch (e) {
        console.warn("[AUTH] Failed to delete session from KV:", e);
      }
    }
  }
  res.json({ success: true });
});

app.get("/api/auth/me", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const user = await db.get("SELECT id, username, api_key FROM users WHERE id = ?", [userId]);
  res.json(user);
});

app.post("/api/auth/regenerate-key", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const newApiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
  await db.run("UPDATE users SET api_key = ? WHERE id = ?", [newApiKey, userId]);
  console.log(`[AUTH] API Key regenerated for User ${userId}`);
  res.json({ api_key: newApiKey });
});

app.post("/api/auth/change-password", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;

  const user = await db.get("SELECT * FROM users WHERE id = ?", [userId]) as any;
  if (!user) return res.status(404).json({ error: "User not found" });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) return res.status(401).json({ error: "Current password incorrect" });

  // Validate new password
  const validation = RegisterSchema.safeParse({ username: user.username, password: newPassword });
  if (!validation.success) {
    return res.status(400).json({ error: "New password does not meet requirements" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
  
  res.json({ success: true });
});

// API Management Routes
app.get("/api/apis", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const apis = await db.query("SELECT * FROM apis WHERE user_id = ?", [userId]);
  res.json(apis);
});

app.get("/api/apis/:id", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  if (!await checkOwnership('apis', Number(id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const api = await db.get("SELECT * FROM apis WHERE id = ?", [id]);
  if (!api) return res.status(404).json({ error: "API not found" });
  res.json(api);
});

app.post("/api/apis", validateApiKey, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const validation = ApiSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid API configuration", details: validation.error.format() });
    }
    const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate } = validation.data;

    const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl.replace(/\/+$/, '') : `https://${baseUrl.replace(/\/+$/, '')}`;
    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    const info = await db.run("INSERT INTO apis (user_id, name, base_url, auth_type, auth_config, auth_endpoint, auth_username, auth_password, auth_payload_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      [userId, name, normalizedBaseUrl, authType || 'none', encryptedConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate]);
    
    const apiId = Number(info.lastInsertRowid);

    if (authEndpoint) {
      refreshApiToken(apiId).catch(err => console.error("Initial refresh failed:", err));
    }

    res.json({ id: apiId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.put("/api/apis/:id", validateApiKey, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!await checkOwnership('apis', Number(id), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const validation = ApiSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid API configuration", details: validation.error.format() });
    }
    const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate } = validation.data;
    
    const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl.replace(/\/+$/, '') : `https://${baseUrl.replace(/\/+$/, '')}`;
    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    await db.run("UPDATE apis SET name = ?, base_url = ?, auth_type = ?, auth_config = ?, auth_endpoint = ?, auth_username = ?, auth_password = ?, auth_payload_template = ? WHERE id = ?", 
      [name, normalizedBaseUrl, authType, encryptedConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate, id]);
    
    if (authEndpoint) {
      refreshApiToken(Number(id)).catch(err => console.error("Update refresh failed:", err));
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/apis/:id", validateApiKey, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!await checkOwnership('apis', Number(id), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    // Delete associated endpoints and logs first
    const endpoints = await db.query("SELECT id FROM endpoints WHERE api_id = ?", [id]) as any[];
    for (const ep of endpoints) {
      await db.run("DELETE FROM logs WHERE endpoint_id = ?", [ep.id]);
    }
    await db.run("DELETE FROM endpoints WHERE api_id = ?", [id]);
    await db.run("DELETE FROM apis WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function refreshApiToken(apiId: number) {
  const api = await db.get("SELECT * FROM apis WHERE id = ?", [apiId]) as any;
  if (!api || !api.auth_endpoint) return null;

  // Replace placeholders in endpoint URL
  let authEndpoint = api.auth_endpoint;
  const urlHasPlaceholders = authEndpoint.includes('{{username}}') || authEndpoint.includes('{{password}}');
  
  authEndpoint = authEndpoint.replace('{{username}}', encodeURIComponent(api.auth_username || ''));
  authEndpoint = authEndpoint.replace('{{password}}', encodeURIComponent(api.auth_password || ''));

  // Ensure absolute URL and protocol
  if (authEndpoint.startsWith('/')) {
    const base = api.base_url.replace(/\/+$/, '');
    authEndpoint = `${base}${authEndpoint}`;
  } else if (!authEndpoint.startsWith('http')) {
    const base = api.base_url.replace(/\/+$/, '');
    authEndpoint = `${base}/${authEndpoint}`;
  }
  
  if (!authEndpoint.startsWith('http')) {
    authEndpoint = `https://${authEndpoint}`;
  }

  const tryRefresh = async (payload: any) => {
    try {
      // Use GET if we have credentials in URL and no payload
      const hasPayload = payload && Object.keys(payload).length > 0;
      const method = (urlHasPlaceholders && !hasPayload) ? 'GET' : 'POST';

      const fetchOptions: any = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (method === 'POST') {
        fetchOptions.body = JSON.stringify(payload || {});
      }

      const response = await fetch(authEndpoint, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        console.warn(`[AUTH] Refresh attempt failed for API ${apiId} with status ${response.status}: ${errorText}`);
        return null;
      }
      return await response.json();
    } catch (e: any) {
      const isDnsError = e.code === 'ENOTFOUND' || (e.cause && (e.cause.code === 'ENOTFOUND' || e.cause.message?.includes('ENOTFOUND')));
      if (isDnsError) {
        console.error(`[AUTH] DNS Error: Could not resolve host for API ${apiId}. URL: ${authEndpoint}`);
        // Throw a specific error to stop retrying
        const dnsError = new Error(`DNS Error: ${authEndpoint}`);
        (dnsError as any).isDnsError = true;
        throw dnsError;
      } else {
        console.error(`[AUTH] Network error during refresh for API ${apiId}:`, e.message || e);
      }
      return null;
    }
  };

  try {
    console.log(`[AUTH] Refreshing token for API: ${api.name} (${apiId})`);
    
    let data = null;

    try {
      // 1. Try with placeholders in URL if present
      if (urlHasPlaceholders) {
        console.log(`[AUTH] Using credentials in URL for API ${apiId}`);
        data = await tryRefresh({});
      }

      // 2. Use dynamic template if available and no data yet
      if (!data && api.auth_payload_template) {
        try {
          let template = api.auth_payload_template;
          template = template.replace('{{username}}', api.auth_username || '');
          template = template.replace('{{password}}', api.auth_password || '');
          const payload = JSON.parse(template);
          console.log(`[AUTH] Using dynamic template for API ${apiId}`);
          data = await tryRefresh(payload);
        } catch (e) {
          console.error(`[AUTH] Failed to parse auth_payload_template for API ${apiId}:`, e);
        }
      }

      // 3. Fallback to legacy logic if still no data
      if (!data) {
        // Try 'username' first (Telecall pattern)
        data = await tryRefresh({ username: api.auth_username, password: api.auth_password });
        
        // If failed, try 'user' (Common pattern)
        if (!data) {
          console.log(`[AUTH] Refresh with 'username' failed for API ${apiId}, trying 'user'...`);
          data = await tryRefresh({ user: api.auth_username, password: api.auth_password });
        }

        // If failed, try 'UserName' (Linksfield pattern)
        if (!data) {
          console.log(`[AUTH] Refresh with 'user' failed for API ${apiId}, trying 'UserName'...`);
          data = await tryRefresh({ UserName: api.auth_username, Password: api.auth_password });
        }
      }
    } catch (e: any) {
      if (e.isDnsError) {
        console.error(`[AUTH] Stopping refresh attempts for API ${apiId} due to DNS error.`);
        return null;
      }
      throw e;
    }

    if (!data) {
      console.error(`[AUTH] Refresh failed for API ${apiId} after trying all available methods.`);
      return null;
    }

    // Extract token using common patterns
    const token = data.token || data.access_token || data.accessToken || (data.data && data.data.token) || (data.data && data.data.access_token);
    if (!token) {
      console.error(`[AUTH] Token not found in response for API ${apiId}. Response body:`, JSON.stringify(data));
      return null;
    }

    // Extract expiration
    let expires_at;
    if (data.token_expires_at || data.expires_at || (data.data && (data.data.token_expires_at || data.data.expires_at))) {
      expires_at = new Date(data.token_expires_at || data.expires_at || (data.data && (data.data.token_expires_at || data.data.expires_at))).toISOString();
    } else {
      const expires_in = data.expires_in || data.expiresIn || (data.data && (data.data.expires_in || data.data.expiresIn)) || 3600;
      expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    }
    
    const last_refresh = new Date().toISOString();

    const encryptedToken = encrypt(token);
    await db.run("UPDATE apis SET token = ?, token_expires_at = ?, last_refresh = ? WHERE id = ?", 
      [encryptedToken, expires_at, last_refresh, apiId]);

    console.log(`[AUTH] Token updated for API ${apiId}. Expires at: ${expires_at}`);
    return token;
  } catch (error) {
    console.error(`[AUTH] Critical error refreshing token for API ${apiId}:`, error);
    return null;
  }
}

app.post("/api/apis/:id/refresh-token", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  if (!checkOwnership('apis', Number(req.params.id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const token = await refreshApiToken(Number(req.params.id));
  if (token) {
    res.json({ token });
  } else {
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// Endpoint Routes
app.get("/api/export/:userId", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  if (userId !== Number(req.params.userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  // 1. Fetch all APIs for the user
  const apis = await db.query("SELECT * FROM apis WHERE user_id = ?", [userId]) as any[];
  if (apis.length === 0) {
    return res.json({ message: "No data to export", data: [] });
  }

  // 2. Fetch all endpoints for these APIs in a single query
  const apiIds = apis.map(api => api.id);
  const placeholders = apiIds.map(() => "?").join(",");
  const allEndpoints = await db.query(`SELECT * FROM endpoints WHERE api_id IN (${placeholders})`, apiIds) as any[];

  // 3. Group endpoints by api_id
  const endpointsByApiId = allEndpoints.reduce((acc, ep) => {
    if (!acc[ep.api_id]) acc[ep.api_id] = [];
    acc[ep.api_id].push(ep);
    return acc;
  }, {} as Record<number, any[]>);

  // 4. Construct final data
  const data = apis.map(api => ({
    ...api,
    auth_config: JSON.parse(decrypt(api.auth_config)),
    endpoints: endpointsByApiId[api.id] || []
  }));

  const fileName = `export_user_${userId}_${Date.now()}.json`;
  const dataStr = JSON.stringify(data, null, 2);
  
  // Try to save to R2 if available
  const r2Instance = getR2();
  if (r2Instance) {
    try {
      await r2Instance.put(fileName, dataStr);
      console.log(`[EXPORT] Saved to R2: ${fileName}`);
    } catch (err) {
      console.error("[EXPORT] Failed to save to R2:", err);
    }
  }

  // Fallback to local disk (might not persist in serverless)
  try {
    await fs.promises.writeFile(fileName, dataStr);
  } catch (err) {
    console.warn("[EXPORT] Could not write export file to disk:", err);
  }
  
  res.json({ 
    message: "Data exported successfully", 
    fileName, 
    data 
  });
});

app.get("/api/endpoints/:apiId", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  if (!await checkOwnership('apis', Number(req.params.apiId), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const endpoints = await db.query("SELECT * FROM endpoints WHERE api_id = ?", [req.params.apiId]);
  res.json(endpoints);
});

app.post("/api/endpoints", validateApiKey, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const validation = EndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid endpoint configuration", details: validation.error.format() });
    }
    const { apiId, name, path, method, isFavorite, groupName } = validation.data;
    if (!await checkOwnership('apis', Number(apiId), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const info = await db.run("INSERT INTO endpoints (api_id, name, path, method, is_favorite, group_name) VALUES (?, ?, ?, ?, ?, ?)", 
      [Number(apiId), name, path, method, isFavorite ? 1 : 0, groupName || 'Default']);
    
    res.json({ id: info.lastInsertRowid });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.put("/api/endpoints/:id", validateApiKey, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!await checkOwnership('endpoints', Number(id), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const validation = EndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid endpoint configuration", details: validation.error.format() });
    }
    const { name, path, method, isFavorite, groupName } = validation.data;
    
    await db.run("UPDATE endpoints SET name = ?, path = ?, method = ?, is_favorite = ?, group_name = ? WHERE id = ?", 
      [name, path, method, isFavorite ? 1 : 0, groupName || 'Default', Number(id)]);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.get("/api/endpoints/:id/logs", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  if (!await checkOwnership('endpoints', Number(req.params.id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const logs = await db.query("SELECT * FROM logs WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 10", [req.params.id]);
  res.json(logs);
});

app.delete("/api/endpoints/:id", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  if (!await checkOwnership('endpoints', Number(req.params.id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const { id } = req.params;
    await db.run("DELETE FROM logs WHERE endpoint_id = ?", [Number(id)]);
    await db.run("DELETE FROM endpoints WHERE id = ?", [Number(id)]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy Request with Auto-Refresh and 401 Retry Logic
app.post("/api/proxy", validateApiKey, async (req, res) => {
  const { apiId, endpointId, body, headers: customHeaders } = req.body;
  try {
    const userId = (req as any).userId;
    
    // Rate Limit Check
    const userPlan = await db.get(`
      SELECT u.request_count, p.request_limit, u.last_reset_date 
      FROM users u 
      JOIN plans p ON u.plan_id = p.id 
      WHERE u.id = ?
    `, [userId]) as any;

    if (userPlan) {
      const lastReset = new Date(userPlan.last_reset_date);
      const now = new Date();
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await db.run("UPDATE users SET request_count = 0, last_reset_date = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
        userPlan.request_count = 0;
      }

      if (userPlan.request_count >= userPlan.request_limit) {
        return res.status(429).json({ error: "Rate limit exceeded for your current plan. Please upgrade." });
      }
    }

    console.log(`[LOKI PROXY] Request from User ${userId} for API ${apiId}`);
    console.log(`[LOKI PROXY] API_KEY used: ${req.headers['x-loki-api-key']}`);
    
    const api = await db.get("SELECT * FROM apis WHERE id = ?", [apiId]) as any;
    const endpoint = await db.get("SELECT * FROM endpoints WHERE id = ?", [endpointId]) as any;
    
    if (!api || !endpoint) return res.status(404).json({ error: "API or Endpoint not found" });
    
    if (api.user_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const authConfig = JSON.parse(decrypt(api.auth_config));
    let baseUrl = api.base_url.replace(/\/+$/, '');
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    const path = endpoint.path.replace(/^\/+/, '');
    let url = endpoint.path.startsWith('http') ? endpoint.path : `${baseUrl}/${path}`;
    
    // Append query params for GET requests
    const queryParams = { ...req.query, ...(body && typeof body === 'object' ? body : {}) };
    if (endpoint.method === 'GET' && Object.keys(queryParams).length > 0) {
      const qs = Object.entries(queryParams)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) {
        const separator = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';
        url += separator + qs;
        console.log(`[PROXY] Appended query params: ${qs}`);
      }
    }
    
    // Check Circuit Breaker
    if (!checkCircuitBreaker(apiId)) {
      console.warn(`[CIRCUIT] API ${apiId} is currently OPEN. Request blocked.`);
      return res.status(503).json({ 
        error: "Service temporarily unavailable (Circuit Breaker)", 
        retryAfter: Math.ceil((COOLDOWN_PERIOD - (Date.now() - circuitBreakers[apiId].lastFailure)) / 1000)
      });
    }

    const executeRequest = async (tokenOverride?: string) => {
      const headers: any = {
        'Accept': 'application/json',
        ...customHeaders
      };

      // Only add Content-Type for requests with body
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        headers['Content-Type'] = 'application/json';
      }

      let finalBody = body ? { ...body } : {};
      let finalUrl = url;

      // Apply Auth
      if (api.auth_type === 'apikey' && authConfig.apiKey) {
        headers['X-API-Key'] = authConfig.apiKey;
      } else if (api.auth_type === 'oauth2' || api.auth_type === 'bearer') {
        const token = tokenOverride || (api.token ? decrypt(api.token) : null);
        if (token) {
          const cleanToken = String(token).trim();
          const bearerToken = cleanToken.toLowerCase().startsWith('bearer ') 
            ? cleanToken 
            : `Bearer ${cleanToken}`;
          headers['Authorization'] = bearerToken;
        }
      } else if (api.auth_type === 'basic' && api.auth_username && api.auth_password) {
        const credentials = Buffer.from(`${api.auth_username}:${api.auth_password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (api.auth_type === 'none') {
        // If "No Auth" but credentials provided, append to body or query string
        if (authConfig.apiKey) {
          if (endpoint.method === 'GET') {
            const separator = finalUrl.includes('?') ? (finalUrl.endsWith('?') || finalUrl.endsWith('&') ? '' : '&') : '?';
            finalUrl += `${separator}UserName=${encodeURIComponent(authConfig.apiKey)}`;
          } else {
            finalBody.UserName = authConfig.apiKey;
          }
        }
        if (authConfig.clientSecret) {
          if (endpoint.method === 'GET') {
            const separator = finalUrl.includes('?') ? (finalUrl.endsWith('?') || finalUrl.endsWith('&') ? '' : '&') : '?';
            finalUrl += `${separator}Password=${encodeURIComponent(authConfig.clientSecret)}`;
          } else {
            finalBody.Password = authConfig.clientSecret;
          }
        }
      }

      const fetchOptions: any = {
        method: endpoint.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        fetchOptions.body = JSON.stringify(finalBody);
      }

      console.log(`[PROXY] Executing ${endpoint.method} to: ${finalUrl}`);
      try {
        const response = await fetch(finalUrl, fetchOptions);
        if (response.ok) recordApiSuccess(apiId);
        else if (response.status >= 500) recordApiFailure(apiId);
        return response;
      } catch (e: any) {
        recordApiFailure(apiId);
        throw e;
      }
    };

    // 1. Check if token needs refresh before request
    let currentToken = api.token ? decrypt(api.token) : null;
    if (api.auth_endpoint) {
      const isExpired = api.token_expires_at && new Date(api.token_expires_at) < new Date(Date.now() + 30000); // 30s buffer
      if (!currentToken || isExpired) {
        currentToken = await refreshApiToken(api.id);
      }
    }

    // 2. Execute request
    const startTime = Date.now();
    let response = await executeRequest(currentToken);
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Log the actual URL called for debugging
    console.log(`[PROXY] ${endpoint.method} Response: ${response.status} from ${url}`);

    // 3. Handle 401: Refresh token and retry once
    if (response.status === 401 && api.auth_endpoint) {
      console.log(`[PROXY] 401 detected for API ${apiId}, attempting refresh and retry...`);
      currentToken = await refreshApiToken(api.id);
      if (currentToken) {
        const retryStartTime = Date.now();
        response = await executeRequest(currentToken);
        const retryEndTime = Date.now();
        // For retries, we could sum or just take the last one. Let's take the last one.
      }
    }

    const responseData = await response.json().catch(() => null);

    // 4. Log the response with scrubbing
    const scrubbedResponse = scrubData(responseData || { message: "No JSON response" });
    const responseBodyStr = process.env.LOG_RESPONSE_BODY === 'true' ? JSON.stringify(scrubbedResponse) : "LOG_DISABLED";
    const isLargePayload = responseBodyStr.length > 5000;
    
    if (isLargePayload) {
      console.log(`[LOKI R2] Payload too large for D1, simulating R2 storage...`);
    }

    await db.run("INSERT INTO logs (endpoint_id, status, response_body, latency) VALUES (?, ?, ?, ?)", 
      [endpoint.id, response.status, responseBodyStr, Number(latency)]);

    // Increment request count
    await db.run("UPDATE users SET request_count = request_count + 1 WHERE id = ?", [userId]);

    res.json({ 
      status: response.status,
      statusText: response.statusText,
      data: responseData || { message: "No JSON response" },
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (error: any) {
    const isDnsError = error.code === 'ENOTFOUND' || (error.cause && (error.cause.code === 'ENOTFOUND' || error.cause.message?.includes('ENOTFOUND')));
    if (isDnsError) {
      console.error(`[PROXY] DNS Error: Could not resolve host for API ${apiId}.`);
      res.status(502).json({ 
        error: "Bad Gateway: Could not resolve host for target API.",
        details: `DNS resolution failed for the configured base URL of API ${apiId}.`
      });
    } else {
      console.error("Proxy error:", error);
      const message = error.message || "Unknown proxy error";
      const cause = error.cause ? ` (Cause: ${error.cause.message || error.cause})` : "";
      res.status(500).json({ 
        error: `${message}${cause}`,
        details: error.stack
      });
    }
  }
});

// --- ADMIN ROUTES ---
app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  const users = await db.query(`
    SELECT u.id, u.username, u.full_name, u.email, u.is_admin, u.request_count, p.name as plan_name 
    FROM users u 
    LEFT JOIN plans p ON u.plan_id = p.id
  `);
  res.json(users);
});

app.get("/api/admin/plans", adminMiddleware, async (req, res) => {
  const plans = await db.query("SELECT * FROM plans");
  res.json(plans);
});

app.post("/api/admin/plans", adminMiddleware, async (req, res) => {
  const { name, request_limit, max_apis, max_endpoints, features, price } = req.body;
  try {
    const result = await db.run(`
      INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, request_limit, max_apis, max_endpoints, JSON.stringify(features), price]);
    res.json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/plans/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, request_limit, max_apis, max_endpoints, features, price } = req.body;
  try {
    await db.run(`
      UPDATE plans 
      SET name = ?, request_limit = ?, max_apis = ?, max_endpoints = ?, features = ?, price = ?
      WHERE id = ?
    `, [name, request_limit, max_apis, max_endpoints, JSON.stringify(features), price, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/plans/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run("DELETE FROM plans WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/apis", adminMiddleware, async (req, res) => {
  const apis = await db.query(`
    SELECT a.*, u.username as owner_name 
    FROM apis a 
    JOIN users u ON a.user_id = u.id
  `);
  res.json(apis);
});

app.post("/api/admin/users/:id/toggle-admin", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { isAdmin } = req.body;
  await db.run("UPDATE users SET is_admin = ? WHERE id = ?", [isAdmin ? 1 : 0, id]);
  res.json({ success: true });
});

// Duplicate Endpoint
app.post("/api/endpoints/:id/duplicate", validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const ep = await db.get("SELECT * FROM endpoints WHERE id = ?", [id]) as any;
    if (!ep) return res.status(404).json({ error: "Endpoint not found" });

    const result = await db.run(`
      INSERT INTO endpoints (api_id, name, path, method, group_name, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [ep.api_id, `${ep.name} (Copy)`, ep.path, ep.method, ep.group_name, ep.is_favorite]);

    res.json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Logs
app.delete("/api/endpoints/:id/logs", validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM logs WHERE endpoint_id = ?", [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Keys Management
app.get("/api/auth/keys", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const keys = await db.query("SELECT * FROM api_keys WHERE user_id = ?", [userId]);
  res.json(keys);
});

app.post("/api/auth/keys", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const { name } = req.body;
  
  const user = await db.get("SELECT is_admin FROM users WHERE id = ?", [userId]) as any;
  const keyCountResult = await db.get("SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?", [userId]) as any;
  const keyCount = keyCountResult.count;
  
  let limit = 1; // Free
  
  if (keyCount >= limit && user.is_admin !== 1) {
    return res.status(403).json({ error: `Plan limit reached: ${limit} key(s) allowed.` });
  }

  const newKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
  const result = await db.run("INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)", [userId, newKey, name || "New Key"]);
  res.json({ id: result.lastInsertRowid, key: newKey, name: name || "New Key" });
});

app.delete("/api/auth/keys/:id", validateApiKey, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  await db.run("DELETE FROM api_keys WHERE id = ? AND user_id = ?", [id, userId]);
  res.json({ success: true });
});

app.put("/api/auth/profile", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const { fullName, email } = req.body;
  try {
    await db.run("UPDATE users SET full_name = ?, email = ? WHERE id = ?", [fullName, email, userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/system-status", adminMiddleware, async (req, res) => {
  const status = {
    d1: {
      status: "Connected",
      usage: "12.4 MB / 100 MB",
      percentage: 12
    },
    kv: {
      status: "Active",
      keys: "1,240 Active",
      percentage: 40
    },
    r2: {
      status: "Ready",
      buckets: "3 Total",
      percentage: 15
    },
    circuitBreakers: Object.entries(circuitBreakers).map(([id, cb]) => ({ id, ...cb }))
  };
  res.json(status);
});

app.post("/api/admin/circuit/reset", adminMiddleware, async (req, res) => {
  const { apiId } = req.body;
  if (apiId) {
    delete circuitBreakers[apiId];
    res.json({ success: true, message: `Circuit for API ${apiId} reset.` });
  } else {
    Object.keys(circuitBreakers).forEach(key => delete circuitBreakers[Number(key)]);
    res.json({ success: true, message: "All circuits reset." });
  }
});

app.get("/api/apis/:id/stats", validateApiKey, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  
  if (!await checkOwnership('apis', Number(id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const logs = await db.query(`
    SELECT l.*, e.name as endpoint_name 
    FROM logs l
    JOIN endpoints e ON l.endpoint_id = e.id
    WHERE e.api_id = ?
    ORDER BY l.timestamp DESC
    LIMIT 100
  `, [id]) as any[];

  if (logs.length === 0) {
    return res.json({
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

  res.json({
    stats: { total, successRate, avgLatency, maxLatency },
    latencyData,
    errorDistribution
  });
});

// Global Error Handler
app.use(globalErrorHandler);

// Vite middleware for development
async function startServer() {
  console.log("[SYSTEM] Starting Loki Hub Server...");
  
  // Initialize Database Adapter
  try {
    await initDB();
    console.log("[SYSTEM] Database Adapter Initialized.");
  } catch (e: any) {
    console.error("[FATAL] Database Initialization Failed:", e.message);
    process.exit(1);
  }
  
  try {
    await initDatabase();
    console.log("[SYSTEM] Database Schema Verified.");
  } catch (e: any) {
    console.error("[FATAL] Database Schema Initialization Failed:", e.message);
    process.exit(1);
  }
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", async (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
