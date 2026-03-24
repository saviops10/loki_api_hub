import { Context, Next } from "hono";
import { getDB, getKV } from "../db/index.js";
import { AppEnv } from "../types.js";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

// Note: In a real Cloudflare environment, this would use Workers KV or WAF.
// Here we use the database to persist rate limits across restarts as requested.
export const rateLimitMiddleware = async (c: Context<AppEnv>, next: Next) => {
  // In Hono/Cloudflare, c.req.header('cf-connecting-ip') is often used
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const now = Date.now();
  const kv = getKV();

  try {
    if (kv) {
      // Use Cloudflare KV for high-performance rate limiting
      const key = `rate_limit:${ip}`;
      const data = await kv.get(key);
      let limit = data ? JSON.parse(data) : null;

      if (limit && now < limit.reset) {
        if (limit.count >= MAX_REQUESTS) {
          return c.json({ error: "Too many requests. Please try again later." }, 429);
        }
        limit.count += 1;
        await kv.put(key, JSON.stringify(limit), { expirationTtl: Math.ceil((limit.reset - now) / 1000) });
      } else {
        limit = { count: 1, reset: now + RATE_LIMIT_WINDOW };
        await kv.put(key, JSON.stringify(limit), { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW / 1000) });
      }
    } else {
      // Fallback to Database if KV is not available (e.g., local dev)
      const db = getDB();
      await db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          ip TEXT PRIMARY KEY,
          count INTEGER,
          reset INTEGER
        )
      `);

      const limit = await db.get("SELECT * FROM rate_limits WHERE ip = ?", [ip]) as any;

      if (limit && now < limit.reset) {
        if (limit.count >= MAX_REQUESTS) {
          return c.json({ error: "Too many requests. Please try again later." }, 429);
        }
        await db.run("UPDATE rate_limits SET count = count + 1 WHERE ip = ?", [ip]);
      } else {
        await db.run("INSERT OR REPLACE INTO rate_limits (ip, count, reset) VALUES (?, ?, ?)", 
          [ip, 1, now + RATE_LIMIT_WINDOW]);
      }
    }
    await next();
  } catch (error) {
    console.error("Rate limit error:", error);
    await next(); // Fallback to allow request if rate limiter fails
  }
};
