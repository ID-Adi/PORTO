import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { siteSettings } from "../../db/schema/index.js";
import { publicUrl } from "../../lib/public-url.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const SINGLETON_ID = 1;

type SiteSettingsRow = typeof siteSettings.$inferSelect;

function withPublicUrls(row: SiteSettingsRow): SiteSettingsRow {
  return {
    ...row,
    logoUrl: publicUrl(row.logoUrl),
    avatarUrl: publicUrl(row.avatarUrl),
  };
}

const settingsInput = z.object({
  profileName: z.string().min(1),
  profileTitle: z.string().min(1),
  logoUrl: z.string().nullish(),
  avatarUrl: z.string().nullish(),
});

export const siteSettingsRouter = router({
  get: publicProcedure.query(async () => {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, SINGLETON_ID))
      .limit(1);
    return row ? withPublicUrls(row) : null;
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
            avatarUrl: input.avatarUrl ?? null,
          })
          .returning();
        return withPublicUrls(row);
      }

      const [row] = await db
        .update(siteSettings)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(siteSettings.id, SINGLETON_ID))
        .returning();
      return withPublicUrls(row);
    }),
});
