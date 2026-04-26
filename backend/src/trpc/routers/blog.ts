import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { blogPosts } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const blogInput = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  content: z.string().nullish(),
  meta: z.string().nullish(),
  coverUrl: z.string().nullish(),
  published: z.boolean().default(false),
  publishedAt: z.coerce.date().nullish(),
});

export const blogRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure.input(blogInput).mutation(async ({ input }) => {
    const [row] = await db.insert(blogPosts).values(input).returning();
    return row;
  }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: blogInput.partial() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(blogPosts)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(blogPosts.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(blogPosts).where(eq(blogPosts.id, input.id));
      return { ok: true };
    }),
});
