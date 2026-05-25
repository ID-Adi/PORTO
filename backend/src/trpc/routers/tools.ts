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

// Veo 3 hanya mendukung 16:9 dan 9:16 (Vertex AI menolak ratio lain dengan 400).
const VIDEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;
const ALLOWED_VIDEO_MIME = new Set(["video/mp4"]);
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_FRAME_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FRAME_BYTES = 10 * 1024 * 1024;
const N8N_VIDEO_START_TIMEOUT_MS = 60_000;
const N8N_VIDEO_STATUS_TIMEOUT_MS = 60_000;

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

function decodedByteLength(base64: string): number {
  const cleaned = base64.replace(/\s+/g, "");
  if (!cleaned) return 0;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.floor((cleaned.length * 3) / 4) - padding;
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

const framePayload = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(ALLOWED_FRAME_MIME),
});

const generateVideoInput = z.object({
  prompt: z.string().max(2000).optional().default(""),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIOS),
  firstFrame: framePayload,
  lastFrame: framePayload.optional(),
});

type FramePayload = z.infer<typeof framePayload>;

type VideoStartResponse = {
  ok: boolean;
  operationName?: string;
  requestId?: string;
  error?: string;
};

type VideoStatusResponse = {
  ok: boolean;
  done: boolean;
  videoBase64?: string;
  mimeType?: string;
  error?: string;
};

async function callN8nVideoStart(payload: {
  source: "porto-web";
  requestId: string;
  userEmail: string | null | undefined;
  userCaption: string;
  aspectRatio: string;
  firstFrame: FramePayload;
  lastFrame?: FramePayload;
}): Promise<VideoStartResponse> {
  const url = process.env.N8N_VIDEO_WEBHOOK_URL;
  const token = process.env.N8N_WEBHOOK_TOKEN;
  if (!url || !token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "N8N video webhook belum dikonfigurasi",
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
      signal: AbortSignal.timeout(N8N_VIDEO_START_TIMEOUT_MS),
    });
  } catch (err) {
    const isAbort =
      err instanceof DOMException && err.name === "TimeoutError";
    throw new TRPCError({
      code: isAbort ? "TIMEOUT" : "INTERNAL_SERVER_ERROR",
      message: isAbort
        ? "N8N video webhook tidak merespons tepat waktu"
        : "Gagal menghubungi N8N video webhook",
    });
  }

  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `N8N video webhook HTTP ${res.status}`,
    });
  }

  const raw = firstJsonItem(await res.json());
  const json = readStringRecord(raw);
  if (!json) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "N8N video webhook response JSON tidak valid",
    });
  }

  const operationName =
    pickString(json.operationName) ?? pickString(json.name);
  const error = pickString(json.error);
  if (error || !operationName) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error ??
        "N8N video webhook tidak mengembalikan operationName. Pastikan node Respond to Webhook mengembalikan JSON: ok, operationName, requestId.",
    });
  }
  return {
    ok: json.ok === true || Boolean(operationName),
    operationName,
    requestId: pickString(json.requestId),
  };
}

async function callN8nVideoStatus(payload: {
  requestId: string;
  operationName: string;
}): Promise<VideoStatusResponse> {
  const url = process.env.N8N_VIDEO_STATUS_WEBHOOK_URL;
  const token = process.env.N8N_WEBHOOK_TOKEN;
  if (!url || !token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "N8N video status webhook belum dikonfigurasi",
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
      signal: AbortSignal.timeout(N8N_VIDEO_STATUS_TIMEOUT_MS),
    });
  } catch (err) {
    const isAbort =
      err instanceof DOMException && err.name === "TimeoutError";
    throw new TRPCError({
      code: isAbort ? "TIMEOUT" : "INTERNAL_SERVER_ERROR",
      message: isAbort
        ? "N8N video status tidak merespons tepat waktu"
        : "Gagal menghubungi N8N video status",
    });
  }

  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `N8N video status HTTP ${res.status}`,
    });
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Path 1: n8n langsung balas binary video/mp4 (done=true case)
  if (contentType.startsWith("video/")) {
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      ok: true,
      done: true,
      mimeType: contentType.split(";")[0],
      videoBase64: buffer.toString("base64"),
    };
  }

  const raw = firstJsonItem(await res.json());
  const json = readStringRecord(raw);
  if (!json) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "N8N video status response JSON tidak valid",
    });
  }

  const error = pickString(json.error);
  if (error) {
    return { ok: false, done: true, error };
  }

  const done = json.done === true;
  const binary = readStringRecord(json.binary ?? json.$binary);
  const binaryVideo = readStringRecord(binary?.video ?? binary?.data);

  const videoBase64 =
    pickString(json.videoBase64) ??
    pickString(json.base64) ??
    pickString(json.data) ??
    pickString(binaryVideo?.data);
  const mimeType =
    pickString(json.mimeType) ?? pickString(binaryVideo?.mimeType);

  return {
    ok: json.ok !== false,
    done,
    videoBase64,
    mimeType,
  };
}

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

  generateVideo: authenticatedProcedure
    .input(generateVideoInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const requestId = randomUUID();

      if (decodedByteLength(input.firstFrame.base64) > MAX_FRAME_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "First frame melebihi 10MB",
        });
      }
      if (
        input.lastFrame &&
        decodedByteLength(input.lastFrame.base64) > MAX_FRAME_BYTES
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End frame melebihi 10MB",
        });
      }

      // Insert row pending dulu supaya frontend bisa polling by id.
      const [row] = await db
        .insert(toolGeneration)
        .values({
          userId,
          kind: "video",
          prompt: input.prompt ?? "",
          aspectRatio: input.aspectRatio,
          requestId,
          status: "pending",
        })
        .returning();

      let started: VideoStartResponse;
      try {
        started = await callN8nVideoStart({
          source: "porto-web",
          requestId,
          userEmail: ctx.session.user.email ?? null,
          userCaption: input.prompt ?? "",
          aspectRatio: input.aspectRatio,
          firstFrame: input.firstFrame,
          lastFrame: input.lastFrame,
        });
      } catch (err) {
        await db
          .update(toolGeneration)
          .set({
            status: "error",
            errorMessage:
              err instanceof Error ? err.message : "Unknown error",
          })
          .where(eq(toolGeneration.id, row.id));
        throw err;
      }

      const [updated] = await db
        .update(toolGeneration)
        .set({ operationName: started.operationName ?? null })
        .where(eq(toolGeneration.id, row.id))
        .returning();

      return {
        id: updated.id,
        requestId,
        jobId: started.operationName!,
        status: "pending" as const,
        createdAt: updated.createdAt,
      };
    }),

  getVideoStatus: authenticatedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
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
      if (row.kind !== "video") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Entry bukan video",
        });
      }

      if (row.status === "success") {
        return {
          status: "success" as const,
          url: publicUrl(row.fileUrl),
          createdAt: row.createdAt,
        };
      }
      if (row.status === "error") {
        return {
          status: "error" as const,
          error: row.errorMessage ?? "Unknown error",
        };
      }
      if (!row.operationName || !row.requestId) {
        return { status: "pending" as const };
      }

      let status: VideoStatusResponse;
      try {
        status = await callN8nVideoStatus({
          requestId: row.requestId,
          operationName: row.operationName,
        });
      } catch (err) {
        // Jangan tandai row error untuk satu kegagalan polling; biarkan
        // frontend retry pada interval berikutnya.
        const message =
          err instanceof Error ? err.message : "Polling status gagal";
        return { status: "pending" as const, transientError: message };
      }

      if (status.error) {
        await db
          .update(toolGeneration)
          .set({ status: "error", errorMessage: status.error })
          .where(eq(toolGeneration.id, row.id));
        return { status: "error" as const, error: status.error };
      }

      if (!status.done) {
        return { status: "pending" as const };
      }

      if (!status.videoBase64 || !status.mimeType) {
        const message =
          "N8N status webhook done=true tetapi tidak mengembalikan videoBase64/mimeType";
        await db
          .update(toolGeneration)
          .set({ status: "error", errorMessage: message })
          .where(eq(toolGeneration.id, row.id));
        return { status: "error" as const, error: message };
      }

      if (!ALLOWED_VIDEO_MIME.has(status.mimeType)) {
        const message = `MIME video tidak didukung: ${status.mimeType}`;
        await db
          .update(toolGeneration)
          .set({ status: "error", errorMessage: message })
          .where(eq(toolGeneration.id, row.id));
        return { status: "error" as const, error: message };
      }

      const buffer = Buffer.from(status.videoBase64, "base64");
      if (buffer.byteLength === 0 || buffer.byteLength > MAX_VIDEO_BYTES) {
        const message = "Ukuran video tidak valid";
        await db
          .update(toolGeneration)
          .set({ status: "error", errorMessage: message })
          .where(eq(toolGeneration.id, row.id));
        return { status: "error" as const, error: message };
      }

      const filename = `${row.requestId}.mp4`;
      const targetPath = ensureContained(
        path.join(TOOLS_UPLOAD_DIR, filename),
      );

      await fs.mkdir(TOOLS_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(targetPath, buffer);

      const fileUrl = `/uploads/tools/${filename}`;

      const [updated] = await db
        .update(toolGeneration)
        .set({
          status: "success",
          fileUrl,
          mimeType: status.mimeType,
          fileSize: buffer.byteLength,
        })
        .where(eq(toolGeneration.id, row.id))
        .returning();

      return {
        status: "success" as const,
        url: publicUrl(updated.fileUrl),
        createdAt: updated.createdAt,
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
