import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import agents from "./routes/agents.js";
import theses from "./routes/theses.js";
import { monitorPositions } from "./services/monitor.js";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/", (c) => c.json({ name: "gethyped", version: "0.1.0", status: "ok" }));

// Routes
app.route("/agents", agents);
app.route("/theses", theses);

// Cron endpoint (called by Vercel Cron)
app.get("/api/cron/monitor", async (c) => {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = c.req.header("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const results = await monitorPositions();
  return c.json({ ok: true, results });
});

export default app;
