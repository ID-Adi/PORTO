import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./auth/index.js";
import { uploadRoute } from "./routes/upload.js";
import { createTRPCContext } from "./trpc/init.js";
import { appRouter } from "./trpc/routers/_app.js";

const app = new Hono();

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://localhost:3001",
    ...(process.env.FRONTEND_URL?.split(",").map((s) => s.trim()) ?? []),
  ].filter(Boolean),
);

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

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
