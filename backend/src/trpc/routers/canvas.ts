import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { canvasDocuments } from "../../db/schema/index.js";
import { authenticatedProcedure, router } from "../init.js";

const sceneInput = z.object({
  sceneData: z.unknown(),
});

export const canvasRouter = router({
  get: authenticatedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select()
      .from(canvasDocuments)
      .where(eq(canvasDocuments.userId, ctx.session.user.id))
      .limit(1);
    return row ?? null;
  }),

  upsert: authenticatedProcedure
    .input(sceneInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [existing] = await db
        .select()
        .from(canvasDocuments)
        .where(eq(canvasDocuments.userId, userId))
        .limit(1);

      if (!existing) {
        const [row] = await db
          .insert(canvasDocuments)
          .values({ userId, sceneData: input.sceneData })
          .returning();
        return row;
      }

      const [row] = await db
        .update(canvasDocuments)
        .set({ sceneData: input.sceneData, updatedAt: new Date() })
        .where(eq(canvasDocuments.userId, userId))
        .returning();
      return row;
    }),

  delete: authenticatedProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(canvasDocuments)
      .where(eq(canvasDocuments.userId, ctx.session.user.id));
    return { ok: true };
  }),
});
