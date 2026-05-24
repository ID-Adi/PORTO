import { promises as fs } from "node:fs";
import path from "node:path";

import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { media } from "../../db/schema/index.js";
import { publicUrl } from "../../lib/public-url.js";
import { UPLOADS_DIR } from "../../lib/uploads-dir.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const mediaInput = z.object({
  filename: z.string().min(1),
  url: z.string().regex(/^\/uploads\/[A-Za-z0-9._-]+$/, "Invalid url path"),
  mimeType: z.string().nullish(),
  size: z.number().int().nullish(),
  width: z.number().int().nullish(),
  height: z.number().int().nullish(),
  alt: z.string().nullish(),
  uploadedBy: z.string().nullish(),
});

type MediaRow = typeof media.$inferSelect;

function withPublicUrl(row: MediaRow): MediaRow & { url: string } {
  // url di DB selalu relative ("/uploads/..."), tapi setelah publicUrl()
  // hasilnya selalu string (passthrough kalau PUBLIC_BACKEND_URL kosong).
  return { ...row, url: publicUrl(row.url) as string };
}

export const mediaRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await db.select().from(media).orderBy(desc(media.createdAt));
    return rows.map(withPublicUrl);
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);
      return row ? withPublicUrl(row) : null;
    }),
  create: protectedProcedure.input(mediaInput).mutation(async ({ input }) => {
    const [row] = await db.insert(media).values(input).returning();
    return withPublicUrl(row);
  }),
  updateAlt: protectedProcedure
    .input(z.object({ id: z.number().int(), alt: z.string().nullish() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(media)
        .set({ alt: input.alt ?? null })
        .where(eq(media.id, input.id))
        .returning();
      return withPublicUrl(row);
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .select()
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);

      if (row?.url?.startsWith("/uploads/")) {
        const filename = path.basename(row.url);
        const filePath = path.resolve(UPLOADS_DIR, filename);
        if (
          filePath !== UPLOADS_DIR &&
          filePath.startsWith(UPLOADS_DIR + path.sep)
        ) {
          await fs.unlink(filePath).catch(() => {
            // file already missing — proceed with row delete
          });
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid media url",
          });
        }
      }

      await db.delete(media).where(eq(media.id, input.id));
      return { ok: true };
    }),
});
