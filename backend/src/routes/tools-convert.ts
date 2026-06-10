import { Hono } from "hono";
import { TRPCError } from "@trpc/server";

import { auth } from "../auth/index.js";
import {
  convertImageForUser,
  type ConvertSourceMime,
} from "../trpc/routers/tools.js";

const ALLOWED_SOURCE_MIME = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;

// Validasi dan limit di sini setara dengan zod `convertImageInput` di jalur
// tRPC; logika konversi/rate-limit/history di-share lewat convertImageForUser.
function statusFromTrpcCode(code: TRPCError["code"]): 400 | 401 | 403 | 429 | 500 {
  if (code === "BAD_REQUEST") return 400;
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "TOO_MANY_REQUESTS") return 429;
  return 500;
}

/**
 * POST /api/tools/convert-image — multipart (field: file, format?, quality?).
 *
 * Transport pengganti base64-in-JSON via tRPC: file 10MB tidak lagi membengkak
 * ~33% dan tidak perlu di-parse sebagai string JSON raksasa di server.
 * Auth: sesi Better-Auth via cookie, tanpa admin gating (selaras
 * `authenticatedProcedure` — resource di-scope per userId).
 */
export const toolsConvertRoute = new Hono().post("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid multipart body" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file" }, 400);
  }
  if (!ALLOWED_SOURCE_MIME.has(file.type)) {
    return c.json({ error: `Unsupported type: ${file.type}` }, 415);
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return c.json({ error: "Ukuran gambar melebihi 10MB" }, 413);
  }

  const rawFormat = form.get("format");
  if (rawFormat !== null && rawFormat !== "webp" && rawFormat !== "jpeg") {
    return c.json({ error: "Format harus webp atau jpeg" }, 400);
  }
  const format = rawFormat ?? "webp";

  const rawQuality = form.get("quality");
  const quality = rawQuality === null ? 82 : Number(rawQuality);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    return c.json({ error: "Quality harus bilangan bulat 1-100" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await convertImageForUser({
      userId: session.user.id,
      source: {
        buffer,
        mimeType: file.type as ConvertSourceMime,
        fileName: (file.name || "image").slice(0, MAX_FILENAME_LENGTH),
      },
      format,
      quality,
    });
    return c.json(result);
  } catch (err) {
    if (err instanceof TRPCError) {
      return c.json({ error: err.message }, statusFromTrpcCode(err.code));
    }
    console.error(
      "[tools-convert] unexpected error:",
      err instanceof Error ? err.message : String(err),
    );
    return c.json({ error: "Konversi gambar gagal" }, 500);
  }
});
