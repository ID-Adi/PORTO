import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { profileOverview } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const overviewInput = z.object({
  position: z.enum(["lead", "left", "right"]).default("left"),
  icon: z.string().min(1),
  value: z.string().min(1),
  kind: z.enum(["text", "time"]).default("text"),
  copyable: z.boolean().default(false),
  note: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const profileOverviewRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select()
      .from(profileOverview)
      .orderBy(asc(profileOverview.sortOrder), desc(profileOverview.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(profileOverview)
        .where(eq(profileOverview.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure
    .input(overviewInput)
    .mutation(async ({ input }) => {
      const [row] = await db.insert(profileOverview).values(input).returning();
      return row;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: overviewInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(profileOverview)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(profileOverview.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .delete(profileOverview)
        .where(eq(profileOverview.id, input.id));
      return { ok: true };
    }),
});
