-- Ponto de Restauração de Estrutura (Schema)
-- Data: 2026-02-23

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  api_key TEXT UNIQUE,
  failed_attempts INTEGER DEFAULT 0,
  lock_until DATETIME
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_apis_user ON apis(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_api ON endpoints(api_id);
CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
