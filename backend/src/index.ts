import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./auth/index.js";
import { createTRPCContext } from "./trpc/init.js";
import { appRouter } from "./trpc/routers/_app.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

// Better Auth routes
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// tRPC routes
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: () => createTRPCContext(),
  }),
);

app.get("/", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 4001;
console.log(`Backend running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
