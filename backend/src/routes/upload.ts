import { Hono } from "hono";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { media } from "../db/schema/index.js";
import { publicUrl } from "../lib/public-url.js";
import { sanitizeFilename, UPLOADS_DIR } from "../lib/uploads-dir.js";

const MAX_BYTES = 2 * 1024 * 1024;
// SVG sengaja tidak diizinkan: dapat berisi <script>/event handlers yang
// dieksekusi sebagai stored XSS bila diakses langsung dari /uploads/*.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/**
 * POST /api/upload — multipart, admin-only.
 *
 * Menggantikan `frontend/src/app/api/upload/route.ts` (yang tidak bisa jalan
 * di Vercel karena filesystem read-only). Backend di VPS punya volume Docker
 * `porto_uploads` mounted ke `/app/public/uploads` sebagai persistensi.
 *
 * Auth: Better-Auth session via cookie + admin email check (sama pattern
 * dengan `protectedProcedure` di `backend/src/trpc/init.ts:17-26`).
 */
export const uploadRoute = new Hono().post("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && session.user.email !== adminEmail) {
    return c.json({ error: "Forbidden" }, 403);
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart body" }, 400);
  }

  const file = form.get("file");
  const alt = (form.get("alt") as string | null) ?? null;

  if (!(file instanceof File)) {
    return c.json({ error: "Missing file" }, 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return c.json({ error: `Unsupported type: ${file.type}` }, 415);
  }
  if (file.size > MAX_BYTES) {
    return c.json({ error: "File too large (max 2MB)" }, 413);
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const filename = `${randomUUID()}-${sanitizeFilename(file.name)}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const relUrl = `/uploads/${filename}`;

  try {
    const [row] = await db
      .insert(media)
      .values({
        filename,
        url: relUrl,
        mimeType: file.type,
        size: file.size,
        alt,
        uploadedBy: session.user.email ?? null,
      })
      .returning();
    return c.json({ ...row, url: publicUrl(row.url) });
  } catch (err) {
    console.error(
      "[upload] media.insert failed:",
      err instanceof Error ? err.message : String(err),
    );
    await fs.unlink(filepath).catch(() => {
      // file mungkin sudah hilang; abaikan
    });
    return c.json({ error: "Failed to save media record" }, 500);
  }
});
