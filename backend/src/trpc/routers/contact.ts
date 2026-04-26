import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { contactMessages } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const contactCreateInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().nullish(),
  message: z.string().min(1),
});

export const contactRouter = router({
  list: protectedProcedure.query(async () => {
    return db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
  }),
  byId: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  submit: publicProcedure
    .input(contactCreateInput)
    .mutation(async ({ input }) => {
      const [row] = await db.insert(contactMessages).values(input).returning();
      return row;
    }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int(), read: z.boolean() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(contactMessages)
        .set({ read: input.read })
        .where(eq(contactMessages.id, input.id))
        .returning();
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(contactMessages).where(eq(contactMessages.id, input.id));
      return { ok: true };
    }),
});
