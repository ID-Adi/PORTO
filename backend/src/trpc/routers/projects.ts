import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { projects } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const projectInput = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  detail: z.string().nullish(),
  period: z.string().nullish(),
  imageUrl: z.string().nullish(),
  url: z.string().nullish(),
  repoUrl: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export const projectsRouter = router({
  list: publicProcedure.query(async () => {
    return db
      .select()
      .from(projects)
      .orderBy(projects.sortOrder, desc(projects.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure
    .input(projectInput)
    .mutation(async ({ input }) => {
      const [row] = await db.insert(projects).values(input).returning();
      return row;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: projectInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(projects)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(projects).where(eq(projects.id, input.id));
      return { ok: true };
    }),
});
