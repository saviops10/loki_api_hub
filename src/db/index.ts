import Database from "better-sqlite3";

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<{ lastInsertRowid: number | string; changes: number }>;
  exec(sql: string): Promise<void>;
  pragma(sql: string): void;
}

class SQLiteAdapter implements DatabaseAdapter {
  private db: any;

  constructor(filename: string) {
    this.db = new Database(filename);
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
}

let dbInstance: DatabaseAdapter;

export const initDB = (env?: any) => {
  if (env?.DB) {
    dbInstance = new D1Adapter(env.DB);
  } else {
    dbInstance = new SQLiteAdapter("data.db");
  }
  return dbInstance;
};

export const getDB = () => {
  if (!dbInstance) {
    dbInstance = new SQLiteAdapter("data.db");
  }
  return dbInstance;
};
