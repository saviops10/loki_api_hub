import { Context } from "hono";
import { AppEnv, DatabaseAdapter } from "../types.js";
import { hashPassword } from "../utils/password.js";

class SQLiteAdapter implements DatabaseAdapter {
  private db: any;

  constructor(db: any) {
    this.db = db;
    try {
      this.db.pragma("journal_mode = WAL");
    } catch (e) {
      console.warn("Could not set journal_mode = WAL", e);
    }
  }

  static async create(filename: string) {
    const Database = (await import("better-sqlite3")).default;
    return new SQLiteAdapter(new Database(filename));
  }

  pragma(sql: string): void {
    this.db.pragma(sql);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number | string; changes: number }> {
    const result = this.db.prepare(sql).run(...params);
    return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async batch(statements: { sql: string; params?: any[] }[]): Promise<void> {
    const transaction = this.db.transaction((stmts: any[]) => {
      for (const stmt of stmts) {
        this.db.prepare(stmt.sql).run(...(stmt.params || []));
      }
    });
    transaction(statements);
  }

  getType(): string {
    return "SQLite (Local)";
  }
}

class D1Adapter implements DatabaseAdapter {
  constructor(private d1: D1Database) {}

  pragma(_sql: string): void {
    // D1 doesn't support pragma in the same way
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { results } = await this.d1.prepare(sql).bind(...params).all();
    return results as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return await this.d1.prepare(sql).bind(...params).first() as T | undefined;
  }

  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number | string; changes: number }> {
    const result = await this.d1.prepare(sql).bind(...params).run();
    return { lastInsertRowid: result.meta.last_row_id, changes: result.meta.changes };
  }

  async exec(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }

  async batch(statements: { sql: string; params?: any[] }[]): Promise<void> {
    const d1Statements = statements.map(s => this.d1.prepare(s.sql).bind(...(s.params || [])));
    await this.d1.batch(d1Statements);
  }

  getType(): string {
    return "Cloudflare D1";
  }
}

/**
 * Returns the database adapter instance from the context.
 */
export const getDB = (c: Context<AppEnv>): DatabaseAdapter => {
  if (c.env.DB) {
    return new D1Adapter(c.env.DB);
  }
  // Fallback for local development if DB is not provided in env
  // In a real Cloudflare environment, DB should always be present if configured.
  throw new Error("D1 Database binding (DB) not found in environment.");
};

/**
 * Returns the KV adapter instance from the context.
 */
export const getKV = (c: Context<AppEnv>): KVNamespace | undefined => {
  return c.env.SESSION;
};

/**
 * Returns the R2 adapter instance from the context.
 */
export const getR2 = (c: Context<AppEnv>): R2Bucket | undefined => {
  return c.env.PAYLOADS;
};

/**
 * Middleware for Hono to initialize the database schema.
 */
export const dbMiddleware = async (c: Context<AppEnv>, next: () => Promise<void>) => {
  const database = getDB(c);
  await initDatabase(database);
  await next();
};

export const getStatus = (c: Context<AppEnv>) => {
  const db = c.env.DB ? "Cloudflare D1" : "Not Initialized";
  return {
    database: db,
    kv: c.env.SESSION ? "Active (Cloudflare SESSION)" : "Inactive",
    r2: c.env.PAYLOADS ? "Active (Cloudflare PAYLOADS)" : "Inactive",
    isCloudflare: !!c.env.DB
  };
};

let isInitialized = false;

export async function initDatabase(database: DatabaseAdapter) {
  if (isInitialized) return;
  
  // Initialize Tables
  try {
    await database.exec(`
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
  } catch (error) {
    console.error("[DB] Failed to initialize core tables:", error);
    throw error;
  }

  // Seed default plans if they don't exist
  try {
    const planCountResult = await database.get<{ count: number }>("SELECT COUNT(*) as count FROM plans");
    const planCount = planCountResult?.count || 0;
    
    if (planCount === 0) {
      await database.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Free', 1000, 5, 20, JSON.stringify(['Até 5 integrações ativas.', 'Painel básico.', 'Ambiente sandbox.', 'Logs limitados.']), 'R$ 0']);
      await database.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Business', 100000, 100, 1000, JSON.stringify(['Integrações ilimitadas.', 'Automação avançada.', 'Logs ampliados.', 'Suporte prioritário.']), 'Sob consulta']);
      await database.run("INSERT INTO plans (name, request_limit, max_apis, max_endpoints, features, price) VALUES (?, ?, ?, ?, ?, ?)", ['Custom', 1000000, 1000, 10000, JSON.stringify(['Arquitetura personalizada.', 'SLAs dedicados.', 'Governança multi-times.', 'Consultoria.']), 'Sob medida']);
    }

    // Assign 'Free' plan to existing users who don't have one
    await database.exec("UPDATE users SET plan_id = (SELECT id FROM plans WHERE name = 'Free') WHERE plan_id IS NULL");

    await database.exec(`
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
  } catch (error) {
    console.error("[DB] Failed to seed default plans or secondary tables:", error);
  }

  // Seed Test User
  try {
    const adminUser = await database.get("SELECT * FROM users WHERE username = ?", ["admin"]);
    
    if (!adminUser) {
      const hashedPassword = await hashPassword("root123!");
      const apiKey = `loki_${crypto.randomUUID().replace(/-/g, '')}`;
      await database.run("INSERT INTO users (username, full_name, email, password, api_key, is_admin) VALUES (?, ?, ?, ?, ?, ?)", ["admin", "System Administrator", "admin@loki.hub", hashedPassword, apiKey, 1]);
      console.log("[DB] Admin user seeded successfully.");
    }
  } catch (error) {
    console.error("[DB] Failed to seed admin user:", error);
  }

  isInitialized = true;
}
