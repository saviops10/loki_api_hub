import { Request, Response, NextFunction } from "express";
import { getDB, getKV, db, kv } from "../db/index.js";
import { UserRow, SessionRow } from "../types.js";

export const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-loki-api-key'];
  const sessionToken = req.headers['x-loki-session-token'] as string;

  if (sessionToken) {
    let session: SessionRow | null = null;
    
    // Try KV first if available
    const kvInstance = getKV();
    if (kvInstance) {
      try {
        const kvData = await kvInstance.get(sessionToken);
        if (kvData) {
          session = JSON.parse(kvData) as SessionRow;
        }
      } catch (e) {
        console.error("[AUTH] KV session lookup failed:", e);
      }
    }

    // Fallback to DB if KV failed or not available
    if (!session) {
      session = await db.get<SessionRow>("SELECT * FROM sessions WHERE token = ?", [sessionToken]) || null;
      
      // If found in DB, sync to KV for next time
      if (session && kvInstance) {
        try {
          await kvInstance.put(sessionToken, JSON.stringify(session), { expirationTtl: 3600 });
        } catch (e) {
          console.warn("[AUTH] Failed to sync session to KV:", e);
        }
      }
    }

    if (session) {
      const lastActivity = new Date(session.last_activity);
      const now = new Date();
      if (now.getTime() - lastActivity.getTime() > 3600000) { // 1 hour
        await db.run("DELETE FROM sessions WHERE token = ?", [sessionToken]);
        if (kvInstance) await kvInstance.delete(sessionToken);
        return res.status(401).json({ error: "Session expired due to inactivity" });
      }
      
      // Update last activity (Background update)
      const updatedActivity = new Date().toISOString();
      db.run("UPDATE sessions SET last_activity = ? WHERE token = ?", [updatedActivity, sessionToken]).catch(console.error);
      if (kvInstance) {
        session.last_activity = updatedActivity;
        kvInstance.put(sessionToken, JSON.stringify(session), { expirationTtl: 3600 }).catch(console.error);
      }
      
      (req as any).userId = session.user_id;
      return next();
    }
  }

  if (!apiKey) return res.status(401).json({ error: "Missing authentication" });

  const user = await db.get<UserRow>("SELECT id FROM users WHERE api_key = ?", [apiKey]);
  if (!user) return res.status(403).json({ error: "Invalid API_KEY" });
  
  (req as any).userId = user.id;
  next();
};

export const checkOwnership = async (table: string, id: number, userId: number) => {
  if (table === 'apis') {
    const api = await db.get<{ user_id: number }>("SELECT user_id FROM apis WHERE id = ?", [id]);
    return api && api.user_id === userId;
  }
  if (table === 'endpoints') {
    const ep = await db.get<{ api_id: number }>("SELECT api_id FROM endpoints WHERE id = ?", [id]);
    if (!ep) return false;
    const api = await db.get<{ user_id: number }>("SELECT user_id FROM apis WHERE id = ?", [ep.api_id]);
    return api && api.user_id === userId;
  }
  return false;
};

export const adminMiddleware = async (req: any, res: any, next: any) => {
  const sessionToken = req.headers['x-loki-session-token'];
  if (!sessionToken) return res.status(401).json({ error: "Unauthorized" });

  let userId: number | null = null;
  const kvInstance = getKV();
  
  if (kvInstance) {
    try {
      const kvData = await kvInstance.get(sessionToken);
      if (kvData) {
        const session = JSON.parse(kvData) as SessionRow;
        userId = session.user_id;
      }
    } catch (e) {
      console.error("[AUTH] KV session lookup failed in adminMiddleware:", e);
    }
  }

  if (!userId) {
    const session = await db.get<SessionRow>("SELECT user_id FROM sessions WHERE token = ?", [sessionToken]);
    if (!session) return res.status(401).json({ error: "Invalid session" });
    userId = session.user_id;
  }

  const user = await db.get<UserRow>("SELECT is_admin FROM users WHERE id = ?", [userId]);
  if (!user || user.is_admin !== 1) return res.status(403).json({ error: "Forbidden: Admin access required" });

  req.userId = userId;
  next();
};
