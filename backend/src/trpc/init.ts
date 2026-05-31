import { initTRPC, TRPCError } from "@trpc/server";

import { auth } from "../auth/index.js";

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return { session };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;

// Timing log minimal — request lambat (incl canvasAgent.*) terlihat di logs.
const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const res = await next();
  const ms = Date.now() - start;
  if (ms > 200) {
    console.log(`[trpc] ${type} ${path} ${ms}ms ${res.ok ? "ok" : "err"}`);
  }
  return res;
});

const baseProcedure = t.procedure.use(timingMiddleware);

export const publicProcedure = baseProcedure;

export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  // Otorisasi admin ditentukan oleh `role` di DB (dikembalikan via session).
  // ADMIN_EMAIL dipertahankan sebagai fallback bootstrap supaya tidak ada
  // lockout sebelum role tersetel.
  const adminEmail = process.env.ADMIN_EMAIL;
  const role = (ctx.session.user as { role?: string }).role;
  const isAdmin =
    role === "admin" || (!!adminEmail && ctx.session.user.email === adminEmail);
  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Hanya require sesi valid (tanpa admin gating). Dipakai oleh fitur user-level
 * seperti /tools generate, di mana siapa saja yang login (admin atau non-admin)
 * boleh memakai tapi setiap resource di-scope per `userId`.
 */
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
