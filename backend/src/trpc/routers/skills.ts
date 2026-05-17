import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { skills } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const skillInput = z.object({
  name: z.string().min(1),
  category: z.string().default("other"),
  level: z.number().int().min(1).max(5).default(3),
  description: z.string().nullish(),
  years: z.number().int().min(0).nullish(),
  iconUrl: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const skillsRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select()
      .from(skills)
      .orderBy(asc(skills.sortOrder), desc(skills.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(skills)
        .where(eq(skills.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure.input(skillInput).mutation(async ({ input }) => {
    const [row] = await db.insert(skills).values(input).returning();
    return row;
  }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: skillInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(skills)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(skills.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(skills).where(eq(skills.id, input.id));
      return { ok: true };
    }),
});
