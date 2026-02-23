import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

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
    password TEXT
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
`);

// Migration: Ensure new columns exist
const ensureColumns = () => {
  const tables = {
    apis: ['auth_endpoint', 'auth_username', 'auth_password', 'token', 'token_expires_at', 'last_refresh'],
    endpoints: ['group_name']
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
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
  if (!user) {
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", "root");
    console.log("Test user 'admin' created.");
  } else {
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run("root", "admin");
    console.log("Test user 'admin' password reset to 'root'.");
  }
};
seedUser();

app.use(express.json());

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

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth Routes (Simplified for demo, in production use bcrypt and proper sessions)
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for: ${username}`);
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (user) {
    if (user.password === password) {
      console.log(`Login successful for: ${username}`);
      res.json({ id: user.id, username: user.username });
    } else {
      console.log(`Login failed for: ${username} (Wrong password)`);
      res.status(401).json({ error: "Invalid password" });
    }
  } else {
    console.log(`Login failed for: ${username} (User not found)`);
    res.status(401).json({ error: "User not found" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  try {
    const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
    res.json({ id: info.lastInsertRowid, username });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// API Management Routes
app.get("/api/apis", (req, res) => {
  const userId = req.query.userId;
  console.log(`Fetching APIs for userId: ${userId}`);
  const apis = db.prepare("SELECT * FROM apis WHERE user_id = ?").all(Number(userId));
  res.json(apis);
});

app.get("/api/apis/:id", (req, res) => {
  const { id } = req.params;
  const api = db.prepare("SELECT * FROM apis WHERE id = ?").get(id);
  if (!api) return res.status(404).json({ error: "API not found" });
  res.json(api);
});

app.post("/api/apis", (req, res) => {
  try {
    const { userId, name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword } = req.body;
    console.log(`Adding API for userId: ${userId}, Name: ${name}`);
    
    if (!userId || !name || !baseUrl) {
      console.error("Missing required fields:", { userId, name, baseUrl });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    const info = db.prepare("INSERT INTO apis (user_id, name, base_url, auth_type, auth_config, auth_endpoint, auth_username, auth_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(Number(userId), name, baseUrl, authType || 'none', encryptedConfig, authEndpoint, authUsername, authPassword);
    
    const apiId = Number(info.lastInsertRowid);
    console.log("API added successfully, ID:", apiId);

    // Initial Token Refresh if endpoint is provided
    if (authEndpoint) {
      refreshApiToken(apiId).catch(err => console.error("Initial refresh failed:", err));
    }

    res.json({ id: apiId });
  } catch (error: any) {
    console.error("Error adding API:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.put("/api/apis/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, baseUrl, authType, authConfig, authEndpoint, authUsername, authPassword } = req.body;
    
    const encryptedConfig = encrypt(JSON.stringify(authConfig || {}));
    db.prepare("UPDATE apis SET name = ?, base_url = ?, auth_type = ?, auth_config = ?, auth_endpoint = ?, auth_username = ?, auth_password = ? WHERE id = ?")
      .run(name, baseUrl, authType, encryptedConfig, authEndpoint, authUsername, authPassword, id);
    
    // Refresh token if endpoint changed or re-configured
    if (authEndpoint) {
      refreshApiToken(Number(id)).catch(err => console.error("Update refresh failed:", err));
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/apis/:id", (req, res) => {
  try {
    const { id } = req.params;
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

  try {
    console.log(`[AUTH] Refreshing token for API: ${api.name} (${apiId})`);
    const response = await fetch(api.auth_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: api.auth_username,
        password: api.auth_password
      })
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error(`[AUTH] Refresh failed for API ${apiId}:`, data);
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

app.post("/api/apis/:id/refresh-token", async (req, res) => {
  const token = await refreshApiToken(Number(req.params.id));
  if (token) {
    res.json({ token });
  } else {
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// Endpoint Routes
app.get("/api/export/:userId", (req, res) => {
  const userId = req.params.userId;
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

app.get("/api/endpoints/:apiId", (req, res) => {
  const endpoints = db.prepare("SELECT * FROM endpoints WHERE api_id = ?").all(req.params.apiId);
  res.json(endpoints);
});

app.post("/api/endpoints", (req, res) => {
  try {
    const { apiId, name, path, method, isFavorite, groupName } = req.body;
    console.log(`Adding endpoint for apiId: ${apiId}, Name: ${name}`);

    if (!apiId || !name || !path || !method) {
      console.error("Missing required fields for endpoint:", { apiId, name, path, method });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const info = db.prepare("INSERT INTO endpoints (api_id, name, path, method, is_favorite, group_name) VALUES (?, ?, ?, ?, ?, ?)")
      .run(Number(apiId), name, path, method, isFavorite ? 1 : 0, groupName || 'Default');
    
    console.log("Endpoint added successfully, ID:", info.lastInsertRowid);
    res.json({ id: info.lastInsertRowid });
  } catch (error: any) {
    console.error("Error adding endpoint:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.get("/api/endpoints/:id/logs", (req, res) => {
  const logs = db.prepare("SELECT * FROM logs WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 10").all(req.params.id);
  res.json(logs);
});

app.delete("/api/endpoints/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM logs WHERE endpoint_id = ?").run(Number(id));
    db.prepare("DELETE FROM endpoints WHERE id = ?").run(Number(id));
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy Request with Auto-Refresh and 401 Retry Logic
app.post("/api/proxy", async (req, res) => {
  try {
    const { apiId, endpointId, body, headers: customHeaders } = req.body;
    
    const api = db.prepare("SELECT * FROM apis WHERE id = ?").get(apiId) as any;
    const endpoint = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(endpointId) as any;
    
    if (!api || !endpoint) return res.status(404).json({ error: "API or Endpoint not found" });

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

      // Apply Auth
      if (api.auth_type === 'apikey' && authConfig.apiKey) {
        headers['X-API-Key'] = authConfig.apiKey;
      } else if (api.auth_type === 'oauth2') {
        const token = tokenOverride || (api.token ? decrypt(api.token) : null);
        if (token) {
          const cleanToken = String(token).trim();
          headers['Authorization'] = `bearer ${cleanToken}`;
          console.log(`[PROXY] Authorization header injected for API ${apiId}. Token starts with: ${cleanToken.substring(0, 10)}...`);
        } else {
          console.warn(`[PROXY] No token found for API ${apiId} even though auth_type is oauth2`);
        }
      } else {
        console.log(`[PROXY] No auth applied for API ${apiId} (auth_type: ${api.auth_type})`);
      }

      console.log(`[PROXY] Executing ${endpoint.method} to ${url}`);
      console.log(`[PROXY] Headers:`, JSON.stringify(headers));

      const fetchOptions: any = {
        method: endpoint.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      return await fetch(url, fetchOptions);
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

    // 4. Log the response
    db.prepare("INSERT INTO logs (endpoint_id, status, response_body) VALUES (?, ?, ?)")
      .run(endpoint.id, response.status, JSON.stringify(responseData || { message: "No JSON response" }));

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
