import { Request, Response, NextFunction } from "express";
import { getDB } from "../db/index.js";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

// Note: In a real Cloudflare environment, this would use Workers KV or WAF.
// Here we use the database to persist rate limits across restarts as requested.
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const db = getDB();
  const ip = req.ip || 'unknown';
  const now = Date.now();

  try {
    // Ensure table exists (usually done in initDB, but safe here too)
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
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
      await db.run("UPDATE rate_limits SET count = count + 1 WHERE ip = ?", [ip]);
    } else {
      await db.run("INSERT OR REPLACE INTO rate_limits (ip, count, reset) VALUES (?, ?, ?)", 
        [ip, 1, now + RATE_LIMIT_WINDOW]);
    }
    next();
  } catch (error) {
    console.error("Rate limit error:", error);
    next(); // Fallback to allow request if rate limiter fails
  }
};
