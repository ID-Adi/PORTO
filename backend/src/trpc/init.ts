import { initTRPC } from "@trpc/server";

export const createTRPCContext = async () => {
  return {};
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;
