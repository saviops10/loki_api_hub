import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import bcrypt from "bcryptjs";
import { z } from "zod";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Database Initialization
const db = new Database("data.db");
db.pragma("journal_mode = WAL");

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    full_name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    api_key TEXT UNIQUE,
    is_admin INTEGER DEFAULT 0,
    failed_attempts INTEGER DEFAULT 0,
    lock_until DATETIME
  );

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
const ensureColumns = () => {
  const tables = {
    apis: ['auth_endpoint', 'auth_username', 'auth_password', 'auth_payload_template', 'token', 'token_expires_at', 'last_refresh'],
    endpoints: ['group_name'],
    users: ['failed_attempts', 'lock_until', 'api_key', 'full_name', 'email', 'is_admin']
  };

  for (const [table, columns] of Object.entries(tables)) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const existingColumns = info.map(c => c.name);
    
    for (const col of columns) {
      if (!existingColumns.includes(col)) {
        console.log(`Adding column ${col} to table ${table}`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`).run();
      }
    }
  }
};
ensureColumns();

// Seed Test User
const seedUser = () => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get("admin") as any;
  const hashedPassword = bcrypt.hashSync("root123!", 10);
  const apiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
  
  if (!user) {
    db.prepare("INSERT INTO users (username, full_name, email, password, api_key, is_admin) VALUES (?, ?, ?, ?, ?, ?)")
      .run("admin", "System Administrator", "admin@loki.hub", hashedPassword, apiKey, 1);
    console.log("Test user 'admin' created.");
  } else {
    // Ensure admin has is_admin = 1
    if (user.is_admin !== 1) {
      db.prepare("UPDATE users SET is_admin = 1 WHERE username = ?").run("admin");
    }
    // Update existing user to use bcrypt if needed
    if (!user.password.startsWith('$2a$')) {
      db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hashedPassword, "admin");
      console.log("Test user 'admin' password migrated to bcrypt.");
    }
  }
};
seedUser();

app.use(express.json());

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;");
  next();
});

// Simple Rate Limiter
const rateLimits = new Map<string, { count: number, reset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

app.use((req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (limit && now < limit.reset) {
    if (limit.count >= MAX_REQUESTS) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    limit.count++;
  } else {
    rateLimits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
  }
  next();
});

// Security: Encryption helper
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'smart-api-hub-default-secret-key-2024';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return '{}';
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("Decryption failed:", e);
    return '{}';
  }
}

// Log Scrubber for security
function scrubData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const sensitiveKeys = ['password', 'token', 'access_token', 'apiKey', 'api_key', 'secret', 'authorization'];
  const scrubbed = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in scrubbed) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      scrubbed[key] = '********';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubData(scrubbed[key]);
    }
  }
  return scrubbed;
}

// Zod Schemas
const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

const RegisterSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
  termsAccepted: z.boolean().refine(v => v === true, "You must accept the terms"),
  privacyAccepted: z.boolean().refine(v => v === true, "You must accept the privacy policy")
});

const ApiSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  authType: z.enum(['none', 'apikey', 'oauth2']),
  authConfig: z.record(z.string(), z.any()).optional(),
  authEndpoint: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  authPayloadTemplate: z.string().optional()
});

const EndpointSchema = z.object({
  apiId: z.number(),
  name: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  groupName: z.string().optional(),
  isFavorite: z.boolean().optional()
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Middleware to validate API_KEY or Session
const validateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-loki-api-key'];
  const sessionToken = req.headers['x-loki-session-token'];

  if (sessionToken) {
    const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(sessionToken) as any;
    if (session) {
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      if (now.getTime() - lastActivity.getTime() > 3600000) { // 1 hour
        db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionToken);
        return res.status(401).json({ error: "Session expired due to inactivity" });
      }
      db.prepare("UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?").run(sessionToken);
      (req as any).userId = session.user_id;
      return next();
    }
  }

  if (!apiKey) return res.status(401).json({ error: "Missing authentication" });

  const user = db.prepare("SELECT id FROM users WHERE api_key = ?").get(apiKey);
  if (!user) return res.status(403).json({ error: "Invalid API_KEY" });
  
  (req as any).userId = (user as any).id;
  next();
};

const checkOwnership = (table: string, id: number, userId: number) => {
  if (table === 'apis') {
    const api = db.prepare("SELECT user_id FROM apis WHERE id = ?").get(id) as any;
    return api && api.user_id === userId;
  }
  if (table === 'endpoints') {
    const ep = db.prepare("SELECT api_id FROM endpoints WHERE id = ?").get(id) as any;
    if (!ep) return false;
    const api = db.prepare("SELECT user_id FROM apis WHERE id = ?").get(ep.api_id) as any;
    return api && api.user_id === userId;
  }
  return false;
};

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const validation = LoginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Invalid input format", details: validation.error.format() });
  }
  const { username, password } = validation.data;
  console.log(`[AUTH] Login attempt for: ${username}`);
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  
  if (!user) {
    console.warn(`[AUTH] Login failure: User not found (${username})`);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check lock
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    console.warn(`[AUTH] Login failure: Account locked (${username})`);
    return res.status(423).json({ error: "Account temporarily locked. Try again later." });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  
  if (isValid) {
    console.log(`[AUTH] Login success: ${username}`);
    db.prepare("UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?").run(user.id);
    const sessionToken = crypto.randomBytes(32).toString('hex');
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(sessionToken, user.id);
    res.json({ 
      id: user.id, 
      username: user.username, 
      api_key: user.api_key, 
      is_admin: user.is_admin,
      session_token: sessionToken 
    });
  } else {
    console.warn(`[AUTH] Login failure: Invalid password (${username})`);
    const attempts = user.failed_attempts + 1;
    let lockUntil = null;
    if (attempts >= 5) {
      lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins lock
      console.warn(`[AUTH] Account locked due to multiple failures: ${username}`);
    }
    db.prepare("UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?").run(attempts, lockUntil, user.id);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const validation = RegisterSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
      error: validation.error.issues[0].message
    });
  }
  const { username, fullName, email, password } = validation.data;
  console.log(`[AUTH] Registration attempt for: ${username}`);

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const apiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
    
    // Check if this is the first user
    const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
    const isAdmin = userCount === 0 ? 1 : 0;

    const info = db.prepare("INSERT INTO users (username, full_name, email, password, api_key, is_admin) VALUES (?, ?, ?, ?, ?, ?)").run(username, fullName, email, hashedPassword, apiKey, isAdmin);
    console.log(`[AUTH] Registration success: ${username}. API Key generated. Admin: ${isAdmin}`);
    res.json({ id: info.lastInsertRowid, username, apiKey, is_admin: isAdmin });
  } catch (e: any) {
    console.error(`[AUTH] Registration failure: ${e.message}`);
    if (e.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(400).json({ error: "Username already exists" });
  }
});

app.delete("/api/auth/account", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  try {
    db.transaction(() => {
      // Delete all related data
      const apis = db.prepare("SELECT id FROM apis WHERE user_id = ?").all(userId) as any[];
      for (const api of apis) {
        const endpoints = db.prepare("SELECT id FROM endpoints WHERE api_id = ?").all(api.id) as any[];
        for (const ep of endpoints) {
          db.prepare("DELETE FROM logs WHERE endpoint_id = ?").run(ep.id);
        }
        db.prepare("DELETE FROM endpoints WHERE api_id = ?").run(api.id);
      }
      db.prepare("DELETE FROM apis WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    })();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const sessionToken = req.headers['x-loki-session-token'];
  if (sessionToken) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionToken);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare("SELECT id, username, api_key FROM users WHERE id = ?").get(userId);
  res.json(user);
});

app.post("/api/auth/regenerate-key", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const newApiKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
  db.prepare("UPDATE users SET api_key = ? WHERE id = ?").run(newApiKey, userId);
  console.log(`[AUTH] API Key regenerated for User ${userId}`);
  res.json({ api_key: newApiKey });
});

app.post("/api/auth/change-password", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  if (!user) return res.status(404).json({ error: "User not found" });

  const isValid = bcrypt.compareSync(currentPassword, user.password);
  if (!isValid) return res.status(401).json({ error: "Current password incorrect" });

  // Validate new password
  const validation = RegisterSchema.safeParse({ username: user.username, password: newPassword });
  if (!validation.success) {
    return res.status(400).json({ error: "New password does not meet requirements" });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
  
  res.json({ success: true });
});

// API Management Routes
app.get("/api/apis", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const apis = db.prepare("SELECT * FROM apis WHERE user_id = ?").all(userId);
  res.json(apis);
});

app.get("/api/apis/:id", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  if (!checkOwnership('apis', Number(id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const api = db.prepare("SELECT * FROM apis WHERE id = ?").get(id);
  if (!api) return res.status(404).json({ error: "API not found" });
  res.json(api);
});

app.post("/api/apis", validateApiKey, (req, res) => {
  try {
    const userId = (req as any).userId;
    const validation = ApiSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid API configuration", details: validation.error.format() });
    }
    const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate } = validation.data;

    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    const info = db.prepare("INSERT INTO apis (user_id, name, base_url, auth_type, auth_config, auth_endpoint, auth_username, auth_password, auth_payload_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(userId, name, baseUrl, authType || 'none', encryptedConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate);
    
    const apiId = Number(info.lastInsertRowid);

    if (authEndpoint) {
      refreshApiToken(apiId).catch(err => console.error("Initial refresh failed:", err));
    }

    res.json({ id: apiId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.put("/api/apis/:id", validateApiKey, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!checkOwnership('apis', Number(id), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const validation = ApiSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid API configuration", details: validation.error.format() });
    }
    const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate } = validation.data;
    
    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    db.prepare("UPDATE apis SET name = ?, base_url = ?, auth_type = ?, auth_config = ?, auth_endpoint = ?, auth_username = ?, auth_password = ?, auth_payload_template = ? WHERE id = ?")
      .run(name, baseUrl, authType, encryptedConfig, authEndpoint, authUsername, authPassword, authPayloadTemplate, id);
    
    if (authEndpoint) {
      refreshApiToken(Number(id)).catch(err => console.error("Update refresh failed:", err));
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/apis/:id", validateApiKey, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!checkOwnership('apis', Number(id), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    // Delete associated endpoints and logs first
    const endpoints = db.prepare("SELECT id FROM endpoints WHERE api_id = ?").all(id) as any[];
    for (const ep of endpoints) {
      db.prepare("DELETE FROM logs WHERE endpoint_id = ?").run(ep.id);
    }
    db.prepare("DELETE FROM endpoints WHERE api_id = ?").run(id);
    db.prepare("DELETE FROM apis WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function refreshApiToken(apiId: number) {
  const api = db.prepare("SELECT * FROM apis WHERE id = ?").get(apiId) as any;
  if (!api || !api.auth_endpoint) return null;

  const tryRefresh = async (payload: any) => {
    try {
      const response = await fetch(api.auth_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  };

  try {
    console.log(`[AUTH] Refreshing token for API: ${api.name} (${apiId})`);
    
    let data = null;

    // Use dynamic template if available
    if (api.auth_payload_template) {
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

    // Fallback to legacy logic if template failed or not provided
    if (!data) {
      // Try 'username' first (Telecall pattern as requested)
      data = await tryRefresh({ username: api.auth_username, password: api.auth_password });
      
      // If failed, try 'user' (Common pattern)
      if (!data) {
        console.log(`[AUTH] Refresh with 'username' failed for API ${apiId}, trying 'user'...`);
        data = await tryRefresh({ user: api.auth_username, password: api.auth_password });
      }
    }

    if (!data) {
      console.error(`[AUTH] Refresh failed for API ${apiId} with both 'username' and 'user' fields.`);
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
    db.prepare("UPDATE apis SET token = ?, token_expires_at = ?, last_refresh = ? WHERE id = ?")
      .run(encryptedToken, expires_at, last_refresh, apiId);

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
app.get("/api/export/:userId", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  if (userId !== Number(req.params.userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const apis = db.prepare("SELECT * FROM apis WHERE user_id = ?").all(userId) as any[];
  
  const data = apis.map(api => {
    const endpoints = db.prepare("SELECT * FROM endpoints WHERE api_id = ?").all(api.id);
    return {
      ...api,
      auth_config: JSON.parse(decrypt(api.auth_config)),
      endpoints
    };
  });

  const fileName = `export_user_${userId}.json`;
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
  
  res.json({ message: "Data exported successfully", fileName, data });
});

app.get("/api/endpoints/:apiId", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  if (!checkOwnership('apis', Number(req.params.apiId), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const endpoints = db.prepare("SELECT * FROM endpoints WHERE api_id = ?").all(req.params.apiId);
  res.json(endpoints);
});

app.post("/api/endpoints", validateApiKey, (req, res) => {
  try {
    const userId = (req as any).userId;
    const validation = EndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid endpoint configuration", details: validation.error.format() });
    }
    const { apiId, name, path, method, isFavorite, groupName } = validation.data;
    if (!checkOwnership('apis', Number(apiId), userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const info = db.prepare("INSERT INTO endpoints (api_id, name, path, method, is_favorite, group_name) VALUES (?, ?, ?, ?, ?, ?)")
      .run(Number(apiId), name, path, method, isFavorite ? 1 : 0, groupName || 'Default');
    
    res.json({ id: info.lastInsertRowid });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.get("/api/endpoints/:id/logs", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  if (!checkOwnership('endpoints', Number(req.params.id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  const logs = db.prepare("SELECT * FROM logs WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 10").all(req.params.id);
  res.json(logs);
});

app.delete("/api/endpoints/:id", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  if (!checkOwnership('endpoints', Number(req.params.id), userId)) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM logs WHERE endpoint_id = ?").run(Number(id));
    db.prepare("DELETE FROM endpoints WHERE id = ?").run(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy Request with Auto-Refresh and 401 Retry Logic
app.post("/api/proxy", validateApiKey, async (req, res) => {
  try {
    const { apiId, endpointId, body, headers: customHeaders } = req.body;
    const userId = (req as any).userId;
    
    console.log(`[LOKI PROXY] Request from User ${userId} for API ${apiId}`);
    console.log(`[LOKI PROXY] API_KEY used: ${req.headers['x-loki-api-key']}`);
    
    const api = db.prepare("SELECT * FROM apis WHERE id = ?").get(apiId) as any;
    const endpoint = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(endpointId) as any;
    
    if (!api || !endpoint) return res.status(404).json({ error: "API or Endpoint not found" });
    
    if (api.user_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const authConfig = JSON.parse(decrypt(api.auth_config));
    const baseUrl = api.base_url.replace(/\/+$/, '');
    const path = endpoint.path.replace(/^\/+/, '');
    let url = `${baseUrl}/${path}`;
    
    // Append query params for GET requests
    if (endpoint.method === 'GET' && body && typeof body === 'object') {
      const qs = Object.entries(body)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    
    const executeRequest = async (tokenOverride?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...customHeaders
      };

      let finalBody = body ? { ...body } : {};

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
      } else if (api.auth_type === 'none') {
        // If "No Auth" but credentials provided, append to body as per user request
        if (authConfig.apiKey) finalBody.UserName = authConfig.apiKey;
        if (authConfig.clientSecret) finalBody.Password = authConfig.clientSecret;
      }

      const fetchOptions: any = {
        method: endpoint.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        fetchOptions.body = JSON.stringify(finalBody);
      }

      const response = await fetch(url, fetchOptions);
      return response;
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
    console.log(`[PROXY] Final URL: ${url}`);
    let response = await executeRequest(currentToken);

    // 3. Handle 401: Refresh token and retry once
    if (response.status === 401 && api.auth_endpoint) {
      console.log(`[PROXY] 401 detected for API ${apiId}, attempting refresh and retry...`);
      currentToken = await refreshApiToken(api.id);
      if (currentToken) {
        response = await executeRequest(currentToken);
      }
    }

    const responseData = await response.json().catch(() => null);

    // 4. Log the response with scrubbing
    const scrubbedResponse = scrubData(responseData || { message: "No JSON response" });
    const responseBodyStr = JSON.stringify(scrubbedResponse);
    const isLargePayload = responseBodyStr.length > 5000;
    
    if (isLargePayload) {
      console.log(`[LOKI R2] Payload too large for D1, simulating R2 storage...`);
    }

    db.prepare("INSERT INTO logs (endpoint_id, status, response_body) VALUES (?, ?, ?)")
      .run(endpoint.id, response.status, responseBodyStr);

    res.json({ 
      status: response.status,
      statusText: response.statusText,
      data: responseData || { message: "No JSON response" },
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- ADMIN ROUTES ---
const adminMiddleware = (req: any, res: any, next: any) => {
  const sessionToken = req.headers['x-loki-session-token'];
  if (!sessionToken) return res.status(401).json({ error: "Unauthorized" });

  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(sessionToken) as any;
  if (!session) return res.status(401).json({ error: "Invalid session" });

  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(session.user_id) as any;
  if (!user || user.is_admin !== 1) return res.status(403).json({ error: "Forbidden: Admin access required" });

  req.userId = session.user_id;
  next();
};

app.get("/api/admin/users", adminMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, username, full_name, email, is_admin FROM users").all();
  res.json(users);
});

app.get("/api/admin/apis", adminMiddleware, (req, res) => {
  const apis = db.prepare(`
    SELECT a.*, u.username as owner_name 
    FROM apis a 
    JOIN users u ON a.user_id = u.id
  `).all();
  res.json(apis);
});

app.post("/api/admin/users/:id/toggle-admin", adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { isAdmin } = req.body;
  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(isAdmin, id);
  res.json({ success: true });
});

// Duplicate Endpoint
app.post("/api/endpoints/:id/duplicate", validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const ep = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id) as any;
    if (!ep) return res.status(404).json({ error: "Endpoint not found" });

    const result = db.prepare(`
      INSERT INTO endpoints (api_id, name, path, method, group_name, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(ep.api_id, `${ep.name} (Copy)`, ep.path, ep.method, ep.group_name, ep.is_favorite);

    res.json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Logs
app.delete("/api/endpoints/:id/logs", validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM logs WHERE endpoint_id = ?").run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Keys Management
app.get("/api/auth/keys", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const keys = db.prepare("SELECT * FROM api_keys WHERE user_id = ?").all(userId);
  res.json(keys);
});

app.post("/api/auth/keys", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const { name } = req.body;
  
  // Plan limits (simulated for now based on user request)
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(userId) as any;
  const keyCount = (db.prepare("SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?").get(userId) as any).count;
  
  // Default plan limits
  let limit = 1; // Free
  // We could check a 'plan' column if we had one, but let's assume based on admin or just hardcode for now
  // In a real app, we'd have a 'plan' column in users table.
  
  if (keyCount >= limit && user.is_admin !== 1) {
    return res.status(403).json({ error: `Plan limit reached: ${limit} key(s) allowed.` });
  }

  const newKey = `loki_${crypto.randomBytes(16).toString('hex')}`;
  const result = db.prepare("INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)").run(userId, newKey, name || "New Key");
  res.json({ id: result.lastInsertRowid, key: newKey, name: name || "New Key" });
});

app.delete("/api/auth/keys/:id", validateApiKey, (req, res) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  db.prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(id, userId);
  res.json({ success: true });
});

app.put("/api/auth/profile", validateApiKey, (req, res) => {
  const userId = (req as any).userId;
  const { fullName, email } = req.body;
  try {
    db.prepare("UPDATE users SET full_name = ?, email = ? WHERE id = ?").run(fullName, email, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
