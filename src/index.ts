import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbMiddleware, getStatus } from "./db/index.js";
import { AppEnv } from "./types.js";

// Routes
import auth from "./routes/auth.js";
import apis from "./routes/apis.js";
import endpoints from "./routes/endpoints.js";
import proxy from "./routes/proxy.js";
import admin from "./routes/admin.js";

const app = new Hono<AppEnv>();

// Global Middlewares
app.use("*", logger());
app.use("*", cors());
app.use("*", dbMiddleware);

// Health Routes
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/health/status", async (c) => {
  const status = getStatus();
  return c.json({
    status: "ok",
    adapters: status,
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.route("/api/auth", auth);
app.route("/api/apis", apis);
app.route("/api/endpoints", endpoints);
app.route("/api/proxy", proxy);
app.route("/api/admin", admin);

export default app;
