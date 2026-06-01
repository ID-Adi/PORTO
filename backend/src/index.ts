import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./auth/index.js";
import { canvasAgentStreamRoute } from "./routes/canvas-agent-stream.js";
import { mcpRoute } from "./routes/mcp.js";
import { registerPasswordResetRoutes } from "./routes/password-reset.js";
import { uploadRoute } from "./routes/upload.js";
import { createTRPCContext } from "./trpc/init.js";
import { appRouter } from "./trpc/routers/_app.js";

const app = new Hono();

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "http://localhost:3000" || origin === "http://localhost:3001") return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    return hostname === "pawa.my.id" || hostname.endsWith(".pawa.my.id");
  } catch {
    return false;
  }
}

app.use(
  "*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "trpc-accept",
      "x-trpc-source",
      "Cache-Control",
      "Pragma",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Pastikan semua /api/* response tidak di-cache oleh Cloudflare atau CDN.
// Tanpa ini, CF menyimpan response tanpa CORS headers dan melayani ke browser
// yang mengirim Origin header — menyebabkan CORS error.
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

// Password reset routes — MUST be registered as individual app.post()
// (not app.route() with a sub-router) so better-auth's own /api/auth/*
// routes still work. Hono sub-routers intercept unmatched routes with 404.
registerPasswordResetRoutes(app);

// Better-auth catch-all for all other /api/auth/* routes.
// Uses a regex route param (Hono doesn't support ** wildcards).
app.all("/api/auth/:path{.+}", (c) => auth.handler(c.req.raw));

app.route("/api/canvas-agent", canvasAgentStreamRoute);
app.route("/api/mcp", mcpRoute);
app.route("/api/upload", uploadRoute);

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createTRPCContext({ req: c.req.raw }),
  }),
);

// Serve file dinamis (admin uploads + tools generations) dari volume Docker
// yang di-mount ke /app/public/uploads. Filename pakai UUID jadi konten
// immutable — aman cache panjang.
app.use(
  "/uploads/*",
  serveStatic({
    root: "./public",
    onFound: (_path, c) => {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);

app.get("/", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 4002;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Backend running on http://localhost:${info.port}`);
});
