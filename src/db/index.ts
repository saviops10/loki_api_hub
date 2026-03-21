export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<{ lastInsertRowid: number | string; changes: number }>;
  exec(sql: string): Promise<void>;
  pragma(sql: string): void;
  batch(statements: { sql: string; params?: any[] }[]): Promise<void>;
  getType(): string;
}

export interface KVAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface R2Adapter {
  get(key: string): Promise<ReadableStream | null>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
}

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
  constructor(private d1: any) {}

  pragma(_sql: string): void {
    // D1 doesn't support pragma in the same way, usually not needed for WAL
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

let dbInstance: DatabaseAdapter;
let kvInstance: KVAdapter;
let r2Instance: R2Adapter;

export const initDB = async (env?: any) => {
  const actualEnv = env || (globalThis as any);
  const isCloudflare = actualEnv.CF_PAGES === '1' || !!actualEnv.__cf_pages_shared_data;
  
  if (actualEnv.DB) {
    dbInstance = new D1Adapter(actualEnv.DB);
    console.log("Using D1 Database Adapter");
  } else if (!dbInstance) {
    if (isCloudflare && !actualEnv.DB) {
      console.error("CRITICAL: D1 Database binding 'DB' is missing in Cloudflare environment.");
      throw new Error("D1 Database binding 'DB' not found. Please check your Cloudflare Pages settings (Settings -> Functions -> Compatibility flags & D1 Bindings).");
    }

    try {
      dbInstance = await SQLiteAdapter.create("data.db");
      console.log("Using SQLite Database Adapter");
    } catch (e) {
      console.error("Failed to initialize SQLite Adapter", e);
      throw new Error("Database initialization failed. Ensure D1 binding 'DB' is present or better-sqlite3 is available for local development.");
    }
  }

  // Initialize KV if available
  if (actualEnv.SESSION) {
    kvInstance = actualEnv.SESSION;
    console.log("Using KV Storage Adapter (SESSION)");
  } else if (isCloudflare) {
    console.warn("WARNING: KV binding 'SESSION' is missing in Cloudflare environment.");
  }

  // Initialize R2 if available
  if (actualEnv.PAYLOADS) {
    r2Instance = actualEnv.PAYLOADS;
    console.log("Using R2 Storage Adapter (PAYLOADS)");
  } else if (isCloudflare) {
    console.warn("WARNING: R2 binding 'PAYLOADS' is missing in Cloudflare environment.");
  }

  return dbInstance;
};

export const getDB = () => {
  if (!dbInstance) {
    // Try to auto-init from globalThis if possible
    const globalEnv = (globalThis as any);
    if (globalEnv.DB) {
      dbInstance = new D1Adapter(globalEnv.DB);
      return dbInstance;
    }
    throw new Error("Database not initialized. Call await initDB() first.");
  }
  return dbInstance;
};

export const getKV = () => kvInstance;
export const getR2 = () => r2Instance;

export const getStatus = () => {
  return {
    database: dbInstance ? dbInstance.getType() : "Not Initialized",
    kv: kvInstance ? "Active (Cloudflare SESSION)" : "Inactive (Local Fallback)",
    r2: r2Instance ? "Active (Cloudflare PAYLOADS)" : "Inactive (Local Fallback)",
    isCloudflare: (globalThis as any).CF_PAGES === '1' || !!(globalThis as any).__cf_pages_shared_data
  };
};

// Proxies for easier access
export const db: DatabaseAdapter = new Proxy({} as DatabaseAdapter, {
  get: (_, prop) => {
    const instance = getDB();
    return (instance as any)[prop];
  }
});

export const kv: KVAdapter = new Proxy({} as KVAdapter, {
  get: (_, prop) => {
    const instance = getKV();
    if (!instance) throw new Error("KV instance (SESSION) not initialized.");
    return (instance as any)[prop];
  }
});

export const r2: R2Adapter = new Proxy({} as R2Adapter, {
  get: (_, prop) => {
    const instance = getR2();
    if (!instance) throw new Error("R2 instance (PAYLOADS) not initialized.");
    return (instance as any)[prop];
  }
});
