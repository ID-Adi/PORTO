import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { toolGeneration } from "../../db/schema/index.js";
import { publicUrl } from "../../lib/public-url.js";
import { TOOLS_UPLOAD_DIR } from "../../lib/uploads-dir.js";
import { authenticatedProcedure, router } from "../init.js";

const KIND = z.enum(["image", "video"]);

const IMAGE_ASPECT_RATIOS = ["1:1", "4:5", "3:4", "16:9", "9:16"] as const;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const N8N_TIMEOUT_MS = 90_000;

function ensureContained(filePath: string) {
  const resolved = path.resolve(filePath);
  if (
    resolved === TOOLS_UPLOAD_DIR ||
    !resolved.startsWith(TOOLS_UPLOAD_DIR + path.sep)
  ) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid storage path",
    });
  }
  return resolved;
}

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

type N8nResponse = {
  ok?: boolean;
  mimeType?: string;
  imageBase64?: string;
  text?: string;
  requestId?: string;
  error?: string;
};

function firstJsonItem(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function readStringRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function parseN8nResponse(res: Response): Promise<N8nResponse> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.startsWith("image/")) {
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      ok: true,
      mimeType: contentType.split(";")[0],
      imageBase64: buffer.toString("base64"),
    };
  }

  const raw = firstJsonItem(await res.json());
  const json = readStringRecord(raw);
  if (!json) {
    return { ok: false, error: "N8N response JSON tidak valid" };
  }

  const nestedJson = readStringRecord(json.json);
  const binary = readStringRecord(json.binary ?? json.$binary);
  const binaryImage = readStringRecord(binary?.image);

  const imageBase64 =
    pickString(json.imageBase64) ??
    pickString(json.base64) ??
    pickString(json.data) ??
    pickString(binaryImage?.data);
  const mimeType =
    pickString(json.mimeType) ??
    pickString(binaryImage?.mimeType) ??
    pickString(nestedJson?.mimeType);

  return {
    ok: json.ok === true || Boolean(imageBase64),
    mimeType,
    imageBase64,
    text: pickString(json.text) ?? pickString(nestedJson?.text),
    requestId: pickString(json.requestId) ?? pickString(nestedJson?.requestId),
    error: pickString(json.error),
  };
}

async function callN8n(payload: {
  source: "porto-web";
  prompt: string;
  aspectRatio: string;
  requestId: string;
  userEmail: string | null | undefined;
}): Promise<N8nResponse> {
  const url = process.env.N8N_WEBHOOK_URL;
  const token = process.env.N8N_WEBHOOK_TOKEN;
  if (!url || !token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "N8N webhook belum dikonfigurasi",
    });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PORTO-Token": token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    });
  } catch (err) {
    const isAbort =
      err instanceof DOMException && err.name === "TimeoutError";
    throw new TRPCError({
      code: isAbort ? "TIMEOUT" : "INTERNAL_SERVER_ERROR",
      message: isAbort
        ? "N8N tidak merespons tepat waktu"
        : "Gagal menghubungi N8N",
    });
  }

  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `N8N HTTP ${res.status}`,
    });
  }

  const json = await parseN8nResponse(res);
  if (!json.ok || !json.imageBase64 || !json.mimeType) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        json.error ??
        "N8N tidak mengembalikan imageBase64. Pastikan Respond to Webhook (PORTO) mengembalikan JSON: ok, mimeType, imageBase64.",
    });
  }
  return json;
}

const generateImageInput = z.object({
  prompt: z.string().min(1).max(2000),
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS),
});

export const toolsRouter = router({
  generateImage: authenticatedProcedure
    .input(generateImageInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const requestId = randomUUID();

      let response: N8nResponse;
      try {
        response = await callN8n({
          source: "porto-web",
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          requestId,
          userEmail: ctx.session.user.email ?? null,
        });
      } catch (err) {
        // Catat row error supaya history tetap mencerminkan kejadian.
        await db.insert(toolGeneration).values({
          userId,
          kind: "image",
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          requestId,
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "Unknown error",
        });
        throw err;
      }

      const mimeType = response.mimeType!;
      if (!ALLOWED_MIME.has(mimeType)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `MIME tidak didukung: ${mimeType}`,
        });
      }

      const buffer = Buffer.from(response.imageBase64!, "base64");
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ukuran image tidak valid",
        });
      }

      const ext = extensionFromMime(mimeType);
      const filename = `${requestId}.${ext}`;
      const targetPath = ensureContained(path.join(TOOLS_UPLOAD_DIR, filename));

      await fs.mkdir(TOOLS_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(targetPath, buffer);

      const fileUrl = `/uploads/tools/${filename}`;

      const [row] = await db
        .insert(toolGeneration)
        .values({
          userId,
          kind: "image",
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          fileUrl,
          mimeType,
          fileSize: buffer.byteLength,
          requestId,
          status: "success",
        })
        .returning();

      return {
        id: row.id,
        url: publicUrl(fileUrl),
        mimeType,
        requestId,
        createdAt: row.createdAt,
      };
    }),

  listMyHistory: authenticatedProcedure
    .input(z.object({ kind: KIND }))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(toolGeneration)
        .where(
          and(
            eq(toolGeneration.userId, ctx.session.user.id),
            eq(toolGeneration.kind, input.kind),
          ),
        )
        .orderBy(desc(toolGeneration.createdAt))
        .limit(50);
      // DB simpan relative path; response kirim absolute via PUBLIC_BACKEND_URL.
      return rows.map((row) => ({ ...row, fileUrl: publicUrl(row.fileUrl) }));
    }),

  deleteMyEntry: authenticatedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(toolGeneration)
        .where(eq(toolGeneration.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (row.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Hapus file dari disk jika ada (best-effort dengan path containment)
      if (row.fileUrl?.startsWith("/uploads/tools/")) {
        const basename = path.basename(row.fileUrl);
        try {
          const targetPath = ensureContained(
            path.join(TOOLS_UPLOAD_DIR, basename),
          );
          await fs.unlink(targetPath).catch(() => {
            // file sudah tidak ada
          });
        } catch {
          // path tidak valid — abaikan, lanjut hapus row
        }
      }

      await db.delete(toolGeneration).where(eq(toolGeneration.id, input.id));
      return { ok: true };
    }),
});
