import { initTRPC, TRPCError } from "@trpc/server";

import { auth } from "../auth/index.js";

export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({ headers: opts.req.headers });
  return { session };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  if (adminEmail && ctx.session.user.email !== adminEmail) {
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
