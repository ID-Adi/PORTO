import { promises as fs } from "node:fs";
import path from "node:path";

import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { media } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const uploadsDir = path.resolve(
  process.cwd(),
  "..",
  "frontend",
  "public",
  "uploads",
);

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

export const mediaRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(media).orderBy(desc(media.createdAt));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);
      return row ?? null;
    }),
  create: protectedProcedure.input(mediaInput).mutation(async ({ input }) => {
    const [row] = await db.insert(media).values(input).returning();
    return row;
  }),
  updateAlt: protectedProcedure
    .input(z.object({ id: z.number().int(), alt: z.string().nullish() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(media)
        .set({ alt: input.alt ?? null })
        .where(eq(media.id, input.id))
        .returning();
      return row;
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
        const filePath = path.resolve(uploadsDir, filename);
        if (
          filePath !== uploadsDir &&
          filePath.startsWith(uploadsDir + path.sep)
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
