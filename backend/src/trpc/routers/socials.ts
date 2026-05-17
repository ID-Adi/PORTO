import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { socials } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const socialInput = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  detail: z.string().nullish(),
  iconUrl: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const socialsRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select()
      .from(socials)
      .orderBy(asc(socials.sortOrder), desc(socials.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(socials)
        .where(eq(socials.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure
    .input(socialInput)
    .mutation(async ({ input }) => {
      const [row] = await db.insert(socials).values(input).returning();
      return row;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: socialInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(socials)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(socials.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(socials).where(eq(socials.id, input.id));
      return { ok: true };
    }),
});
