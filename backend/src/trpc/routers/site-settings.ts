import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { siteSettings } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const SINGLETON_ID = 1;

const settingsInput = z.object({
  profileName: z.string().min(1),
  profileTitle: z.string().min(1),
  logoUrl: z.string().nullish(),
});

export const siteSettingsRouter = router({
  get: publicProcedure.query(async () => {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, SINGLETON_ID))
      .limit(1);
    return row ?? null;
  }),

  update: protectedProcedure
    .input(settingsInput.partial())
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.id, SINGLETON_ID))
        .limit(1);

      if (!existing) {
        const [row] = await db
          .insert(siteSettings)
          .values({
            id: SINGLETON_ID,
            profileName: input.profileName ?? "",
            profileTitle: input.profileTitle ?? "",
            logoUrl: input.logoUrl ?? null,
          })
          .returning();
        return row;
      }

      const [row] = await db
        .update(siteSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(siteSettings.id, SINGLETON_ID))
        .returning();
      return row;
    }),
});
