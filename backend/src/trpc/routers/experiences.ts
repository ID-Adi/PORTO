import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { experiences } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const experienceInput = z.object({
  period: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const experiencesRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select()
      .from(experiences)
      .orderBy(experiences.sortOrder, desc(experiences.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(experiences)
        .where(eq(experiences.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure
    .input(experienceInput)
    .mutation(async ({ input }) => {
      const [row] = await db.insert(experiences).values(input).returning();
      return row;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: experienceInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(experiences)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(experiences.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(experiences).where(eq(experiences.id, input.id));
      return { ok: true };
    }),
});
