import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { Mp3Encoder } from "@breezystack/lamejs";
import { and, count, desc, eq, gte, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  aiToolSettings,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_VOICES,
  toolGeneration,
} from "../../db/schema/index.js";
import type {
  ToolReferenceImage,
  ToolReferenceMapping,
} from "../../db/schema/tool-generation.js";
import { decryptSecret } from "../../lib/encrypted-secret.js";
import { publicUrl } from "../../lib/public-url.js";
import { callOpenAiAudio } from "../../lib/tts-openai-audio.js";
import {
  isRetryableTtsStatus,
  listProviderModels,
  OPENROUTER_BASE_URL,
  TtsError,
  vertexAccessToken,
  vertexBaseUrl,
  voicesFor,
  type ListModelsArgs,
  type TtsTokens,
} from "../../lib/tts-providers.js";
import {
  TOOLS_REFS_DIR,
  TOOLS_UPLOAD_DIR,
} from "../../lib/uploads-dir.js";
import { authenticatedProcedure, router } from "../init.js";

type TtsProviderId = "gemini" | "vertex" | "openrouter";

const KIND = z.enum(["image", "video", "tts"]);

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
const MAX_TTS_TEXT_LENGTH = 8000;
const MAX_TTS_STYLE_LENGTH = 1000;
const MAX_TTS_SPEAKERS = 4;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const TTS_SAMPLE_RATE = 24_000;
const TTS_CHANNELS = 1;
const TTS_SAMPLE_WIDTH_BYTES = 2;
const TTS_MP3_BITRATE_KBPS = 128;
// Job TTS berjalan in-process; bila row masih `pending` melewati batas ini saat
// dipoll, anggap proses mati (mis. server restart) lalu tandai error. Harus lebih
// besar dari worst-case retry (3×90s fetch + backoff ≈ 273s) agar tak salah-error.
const TTS_JOB_TIMEOUT_MS = 300_000;
const TTS_JOB_RETRY_ATTEMPTS = 3;
// Rate limit per user (DB-based, tanpa infra tambahan).
const TTS_RATE_WINDOW_MS = 60_000;
const TTS_RATE_MAX_PER_WINDOW = 10;
const TTS_PREVIEW_RATE_MAX_PER_WINDOW = 20;
const TTS_PREVIEW_TEXT = "Halo, ini contoh suara.";

function ensureContained(filePath: string, baseDir = TOOLS_UPLOAD_DIR) {
  const resolved = path.resolve(filePath);
  if (
    resolved === baseDir ||
    !resolved.startsWith(baseDir + path.sep)
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
  references: ToolReferenceImage[];
  referenceMapping: ToolReferenceMapping;
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

const framePayload = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(ALLOWED_FRAME_MIME),
});

const MAX_REFERENCES = 6;

const generateImageInput = z.object({
  prompt: z.string().min(1).max(2000),
  aspectRatio: z.enum(IMAGE_ASPECT_RATIOS),
  references: z.array(framePayload).max(MAX_REFERENCES).optional().default([]),
});

const generateVideoInput = z.object({
  prompt: z.string().max(2000).optional().default(""),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIOS),
  firstFrame: framePayload,
  lastFrame: framePayload.optional(),
});

type FramePayload = z.infer<typeof framePayload>;

const ttsSpeakerInput = z.object({
  speaker: z.string().min(1).max(40),
  voiceName: z.string().min(1).max(80),
});

const TTS_PROVIDER = z.enum(["gemini", "vertex", "openrouter"]);

const generateTtsInput = z.object({
  provider: TTS_PROVIDER.optional().default("gemini"),
  model: z.string().min(1).max(160),
  text: z.string().min(1).max(MAX_TTS_TEXT_LENGTH),
  styleInstruction: z.string().max(MAX_TTS_STYLE_LENGTH).optional().default(""),
  speakers: z.array(ttsSpeakerInput).min(1).max(MAX_TTS_SPEAKERS),
  format: z.enum(["wav", "mp3"]).optional().default("wav"),
});

type TtsFormat = z.infer<typeof generateTtsInput>["format"];

type TtsSpeaker = z.infer<typeof ttsSpeakerInput>;
type AiToolSettingsRow = typeof aiToolSettings.$inferSelect;

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

type GeminiTtsResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
        inline_data?: {
          data?: string;
          mime_type?: string;
        };
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
};

function fallbackTtsSettings(): Pick<
  AiToolSettingsRow,
  | "ttsProvider"
  | "ttsModel"
  | "ttsApiKeyEncrypted"
  | "openrouterApiKeyEncrypted"
  | "vertexServiceAccountEncrypted"
  | "vertexProjectId"
  | "vertexLocation"
  | "ttsDefaultVoice"
  | "ttsVoiceOptions"
  | "ttsEnabled"
> {
  return {
    ttsProvider: "gemini",
    ttsModel: DEFAULT_TTS_MODEL,
    ttsApiKeyEncrypted: null,
    openrouterApiKeyEncrypted: null,
    vertexServiceAccountEncrypted: null,
    vertexProjectId: null,
    vertexLocation: "us-central1",
    ttsDefaultVoice: DEFAULT_TTS_VOICE,
    ttsVoiceOptions: [...DEFAULT_TTS_VOICES],
    ttsEnabled: false,
  };
}

async function readTtsSettings() {
  const [row] = await db
    .select()
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, 1))
    .limit(1);
  return row ?? fallbackTtsSettings();
}

function buildSpeechConfig(speakers: TtsSpeaker[]) {
  if (speakers.length === 1) {
    return {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: speakers[0].voiceName,
        },
      },
    };
  }

  return {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: speakers.map((speaker) => ({
        speaker: speaker.speaker,
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: speaker.voiceName,
          },
        },
      })),
    },
  };
}

function wavFromPcm(pcm: Buffer) {
  const dataSize = pcm.byteLength;
  const header = Buffer.alloc(44);
  const byteRate =
    TTS_SAMPLE_RATE * TTS_CHANNELS * TTS_SAMPLE_WIDTH_BYTES;
  const blockAlign = TTS_CHANNELS * TTS_SAMPLE_WIDTH_BYTES;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(TTS_CHANNELS, 22);
  header.writeUInt32LE(TTS_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(TTS_SAMPLE_WIDTH_BYTES * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

// Encode PCM 16-bit mono (TTS_SAMPLE_RATE) menjadi MP3 via lamejs (pure-JS).
function pcmToMp3(pcm: Buffer): Buffer {
  const encoder = new Mp3Encoder(
    TTS_CHANNELS,
    TTS_SAMPLE_RATE,
    TTS_MP3_BITRATE_KBPS,
  );
  // Salin ke ArrayBuffer baru (offset 0) agar alignment Int16Array terjamin —
  // Buffer node bisa punya byteOffset ganjil dari pool yang memicu RangeError.
  const sampleCount = Math.floor(pcm.byteLength / TTS_SAMPLE_WIDTH_BYTES);
  const aligned = pcm.buffer.slice(
    pcm.byteOffset,
    pcm.byteOffset + sampleCount * TTS_SAMPLE_WIDTH_BYTES,
  );
  const samples = new Int16Array(aligned);
  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += blockSize) {
    const slice = samples.subarray(i, i + blockSize);
    const buf = encoder.encodeBuffer(slice);
    if (buf.length > 0) chunks.push(buf);
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(tail);
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

type PcmResult = { pcm: Buffer; tokens: TtsTokens };

function geminiTokens(json: GeminiTtsResponse): TtsTokens {
  const u = json.usageMetadata;
  if (!u) return {};
  return {
    total: u.totalTokenCount,
    prompt: u.promptTokenCount,
    output: u.candidatesTokenCount,
  };
}

function extractGeminiPcm(json: GeminiTtsResponse, label: string): Buffer {
  const part = json.candidates?.[0]?.content?.parts?.find(
    (candidate) => candidate.inlineData?.data || candidate.inline_data?.data,
  );
  const audioBase64 = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!audioBase64) {
    throw new TtsError(`${label} tidak mengembalikan audio base64`, false);
  }
  const pcm = Buffer.from(audioBase64, "base64");
  if (pcm.byteLength === 0 || pcm.byteLength > MAX_AUDIO_BYTES) {
    throw new TtsError("Ukuran audio TTS tidak valid", false);
  }
  return pcm;
}

function geminiRequestBody(modelName: string, text: string, speakers: TtsSpeaker[]) {
  return {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: buildSpeechConfig(speakers),
    },
    model: modelName,
  };
}

// Gemini (Google AI Studio) — generateContent dengan API key.
async function callGeminiTts({
  apiKey,
  model,
  text,
  speakers,
}: {
  apiKey: string;
  model: string;
  text: string;
  speakers: TtsSpeaker[];
}): Promise<PcmResult> {
  const modelName = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiRequestBody(modelName, text, speakers)),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "TimeoutError";
    throw new TtsError(
      isAbort ? "Gemini TTS tidak merespons tepat waktu" : "Gagal menghubungi Gemini TTS",
      true,
    );
  }

  const json = (await res.json()) as GeminiTtsResponse;
  if (!res.ok) {
    throw new TtsError(
      json.error?.message ?? `Gemini TTS HTTP ${res.status}`,
      isRetryableTtsStatus(res.status),
    );
  }
  return { pcm: extractGeminiPcm(json, "Gemini TTS"), tokens: geminiTokens(json) };
}

// Vertex AI — generateContent (bentuk Gemini) via OAuth dari service account.
async function callVertexTts({
  saJson,
  projectId,
  location,
  model,
  text,
  speakers,
}: {
  saJson: string;
  projectId: string;
  location: string;
  model: string;
  text: string;
  speakers: TtsSpeaker[];
}): Promise<PcmResult> {
  const token = await vertexAccessToken(saJson);
  const modelName = model.replace(/^(publishers\/google\/models\/|models\/)/, "");
  const url = `${vertexBaseUrl(location, projectId)}/${modelName}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(geminiRequestBody(modelName, text, speakers)),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "TimeoutError";
    throw new TtsError(
      isAbort ? "Vertex TTS tidak merespons tepat waktu" : "Gagal menghubungi Vertex TTS",
      true,
    );
  }

  const json = (await res.json()) as GeminiTtsResponse;
  if (!res.ok) {
    throw new TtsError(
      json.error?.message ?? `Vertex TTS HTTP ${res.status}`,
      isRetryableTtsStatus(res.status),
    );
  }
  return { pcm: extractGeminiPcm(json, "Vertex TTS"), tokens: geminiTokens(json) };
}

// Retry terbatas + backoff untuk error transient (lintas provider).
async function withTtsRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < TTS_JOB_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof TtsError && err.retryable;
      if (!retryable || attempt === TTS_JOB_RETRY_ATTEMPTS - 1) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastError;
}

// Kredensial provider yang sudah didekripsi (bentuk = ListModelsArgs).
type ProviderCreds = ListModelsArgs;
type AiToolSettingsLike = Awaited<ReturnType<typeof readTtsSettings>>;

// Ambil + dekripsi kredensial provider dari settings; lempar bila belum diatur.
function resolveProviderCreds(
  settings: AiToolSettingsLike,
  provider: TtsProviderId,
): ProviderCreds {
  if (provider === "gemini") {
    if (!settings.ttsApiKeyEncrypted) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Gemini API key belum dikonfigurasi",
      });
    }
    return { provider, apiKey: decryptSecret(settings.ttsApiKeyEncrypted) };
  }
  if (provider === "openrouter") {
    if (!settings.openrouterApiKeyEncrypted) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "OpenRouter API key belum dikonfigurasi",
      });
    }
    return {
      provider,
      apiKey: decryptSecret(settings.openrouterApiKeyEncrypted),
    };
  }
  // vertex
  if (!settings.vertexServiceAccountEncrypted || !settings.vertexProjectId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Kredensial Vertex (Service Account/Project) belum dikonfigurasi",
    });
  }
  return {
    provider,
    saJson: decryptSecret(settings.vertexServiceAccountEncrypted),
    projectId: settings.vertexProjectId,
    location: settings.vertexLocation,
  };
}

// Bangun teks untuk dikirim ke model sesuai provider.
function buildProviderText(
  provider: TtsProviderId,
  script: string,
  style: string,
): string {
  const trimmed = script.trim();
  const dir = style.trim();
  if (provider === "openrouter") {
    // Model chat audio: kirim teks yang ingin diucapkan (style sbg arahan).
    return dir ? `(${dir})\n${trimmed}` : trimmed;
  }
  return dir
    ? `TTS the following text with this direction: ${dir}\n\n${trimmed}`
    : `TTS the following text:\n${trimmed}`;
}

// Worker in-process: generasi + tulis file + update row. Tidak melempar ke
// pemanggil (detached); semua kegagalan ditulis ke row.error.
async function runTtsJob(args: {
  rowId: number;
  requestId: string;
  creds: ProviderCreds;
  model: string;
  script: string;
  style: string;
  speakers: TtsSpeaker[];
  format: TtsFormat;
}): Promise<void> {
  const { rowId, requestId, creds, model, script, style, speakers, format } = args;
  try {
    const text = buildProviderText(creds.provider, script, style);
    let fileBuffer: Buffer;
    let mimeType: string;
    let ext: string;
    let durationSeconds: number | undefined;
    let tokens: TtsTokens;

    if (creds.provider === "openrouter") {
      const result = await withTtsRetry(() =>
        callOpenAiAudio({
          baseUrl: OPENROUTER_BASE_URL,
          apiKey: creds.apiKey,
          model,
          voice: speakers[0]?.voiceName ?? "alloy",
          text,
          format,
        }),
      );
      fileBuffer = result.audio;
      mimeType = result.mimeType;
      ext = format === "mp3" ? "mp3" : "wav";
      tokens = result.tokens;
    } else {
      const { pcm, tokens: t } =
        creds.provider === "gemini"
          ? await withTtsRetry(() =>
              callGeminiTts({ apiKey: creds.apiKey, model, text, speakers }),
            )
          : await withTtsRetry(() =>
              callVertexTts({
                saJson: creds.saJson,
                projectId: creds.projectId,
                location: creds.location,
                model,
                text,
                speakers,
              }),
            );
      const isMp3 = format === "mp3";
      fileBuffer = isMp3 ? pcmToMp3(pcm) : wavFromPcm(pcm);
      mimeType = isMp3 ? "audio/mpeg" : "audio/wav";
      ext = isMp3 ? "mp3" : "wav";
      // Durasi dari PCM (linear), bukan byte file — MP3 non-linear.
      durationSeconds =
        pcm.byteLength / (TTS_SAMPLE_RATE * TTS_CHANNELS * TTS_SAMPLE_WIDTH_BYTES);
      tokens = t;
    }

    const filename = `${requestId}.${ext}`;
    const targetPath = ensureContained(path.join(TOOLS_UPLOAD_DIR, filename));
    await fs.mkdir(TOOLS_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(targetPath, fileBuffer);

    await db
      .update(toolGeneration)
      .set({
        status: "success",
        fileUrl: `/uploads/tools/${filename}`,
        mimeType,
        fileSize: fileBuffer.byteLength,
        outputMeta: {
          ...(durationSeconds !== undefined
            ? { durationSeconds: Math.max(0, Math.round(durationSeconds)) }
            : {}),
          sampleRate: TTS_SAMPLE_RATE,
          channels: TTS_CHANNELS,
          format: ext,
          tokens,
        },
      })
      // Guard optimistik: jangan timpa keputusan reaper (status sudah error).
      .where(and(eq(toolGeneration.id, rowId), eq(toolGeneration.status, "pending")));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generate TTS gagal";
    await db
      .update(toolGeneration)
      .set({ status: "error", errorMessage: message })
      .where(and(eq(toolGeneration.id, rowId), eq(toolGeneration.status, "pending")))
      .catch(() => {
        // best-effort; jangan biarkan unhandledRejection
      });
  }
}

// Rate limit TTS per user (DB-based): cegah job pending ganda + batas/menit.
async function assertTtsRateLimit(userId: string): Promise<void> {
  const [pending] = await db
    .select({ c: count() })
    .from(toolGeneration)
    .where(
      and(
        eq(toolGeneration.userId, userId),
        eq(toolGeneration.kind, "tts"),
        eq(toolGeneration.status, "pending"),
      ),
    );
  if ((pending?.c ?? 0) >= 1) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Masih ada job TTS berjalan. Tunggu sampai selesai.",
    });
  }

  const since = new Date(Date.now() - TTS_RATE_WINDOW_MS);
  const [recent] = await db
    .select({ c: count() })
    .from(toolGeneration)
    .where(
      and(
        eq(toolGeneration.userId, userId),
        eq(toolGeneration.kind, "tts"),
        gte(toolGeneration.createdAt, since),
        // Jangan hitung job yang gagal-cepat agar tak memblok user yang tak abuse.
        ne(toolGeneration.status, "error"),
      ),
    );
  if ((recent?.c ?? 0) >= TTS_RATE_MAX_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Terlalu banyak permintaan TTS. Coba lagi sebentar.",
    });
  }
}

// Throttle preview voice in-memory per user (preview ephemeral, tak menyisipkan
// row sehingga tak bisa diandalkan via DB count). Reset saat proses restart.
const previewHits = new Map<string, number[]>();

function assertPreviewRateLimit(userId: string): void {
  const now = Date.now();
  const recent = (previewHits.get(userId) ?? []).filter(
    (t) => now - t < TTS_RATE_WINDOW_MS,
  );
  if (recent.length >= TTS_PREVIEW_RATE_MAX_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Terlalu banyak preview. Coba lagi sebentar.",
    });
  }
  recent.push(now);
  previewHits.set(userId, recent);
}

function isRetryableVideoStatusError(error: string): boolean {
  return [
    /high load/i,
    /try again later/i,
    /temporarily unavailable/i,
    /service unavailable/i,
    /\bunavailable\b/i,
    /rate limit/i,
  ].some((pattern) => pattern.test(error));
}

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
  getTtsPublicConfig: authenticatedProcedure.query(async () => {
    const settings = await readTtsSettings();
    return {
      enabled: settings.ttsEnabled,
      provider: settings.ttsProvider,
      model: settings.ttsModel,
      defaultVoice: settings.ttsDefaultVoice,
      voiceOptions: settings.ttsVoiceOptions,
      // Status per-provider untuk menentukan provider mana yang bisa dipakai.
      providers: {
        gemini: { hasApiKey: Boolean(settings.ttsApiKeyEncrypted) },
        vertex: {
          hasApiKey: Boolean(
            settings.vertexServiceAccountEncrypted && settings.vertexProjectId,
          ),
        },
        openrouter: { hasApiKey: Boolean(settings.openrouterApiKeyEncrypted) },
      },
      // Kompat lama: hasApiKey = Gemini.
      hasApiKey: Boolean(settings.ttsApiKeyEncrypted),
    };
  }),

  listTtsModels: authenticatedProcedure
    .input(z.object({ provider: TTS_PROVIDER }))
    .query(async ({ input }) => {
      const settings = await readTtsSettings();
      const provider = input.provider as TtsProviderId;
      const creds = resolveProviderCreds(settings, provider);
      const voices = voicesFor(provider, settings.ttsVoiceOptions);
      try {
        const models = await listProviderModels(creds);
        return { models, voices, defaultVoice: voices[0] ?? null };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Gagal memuat daftar model",
        });
      }
    }),

  generateImage: authenticatedProcedure
    .input(generateImageInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const requestId = randomUUID();

      // Validasi ukuran tiap referensi (cap 10MB per gambar)
      for (const ref of input.references) {
        if (decodedByteLength(ref.base64) > MAX_FRAME_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Referensi melebihi 10MB per gambar",
          });
        }
      }

      // Tulis referensi ke disk -> bangun {url, mimeType} untuk N8N.
      const referenceImages: ToolReferenceImage[] = [];
      if (input.references.length > 0) {
        await fs.mkdir(TOOLS_REFS_DIR, { recursive: true });
        for (let i = 0; i < input.references.length; i++) {
          const ref = input.references[i];
          const ext = extensionFromMime(ref.mimeType);
          const refFilename = `${requestId}-${i}.${ext}`;
          const refPath = ensureContained(
            path.join(TOOLS_REFS_DIR, refFilename),
            TOOLS_REFS_DIR,
          );
          await fs.writeFile(refPath, Buffer.from(ref.base64, "base64"));
          referenceImages.push({
            url: publicUrl(`/uploads/tools/refs/${refFilename}`)!,
            mimeType: ref.mimeType,
          });
        }
      }

      // Parse `@N` di prompt ke mapping. Hanya N yang valid (1..references.length)
      // yang masuk; sisanya silently di-skip agar user bebas mengetik tag.
      const referenceMapping: ToolReferenceMapping = {};
      const tagRegex = /@([1-6])/g;
      const promptTags = new Set<string>();
      for (const match of input.prompt.matchAll(tagRegex)) {
        promptTags.add(match[0]);
      }
      for (const token of promptTags) {
        const num = Number(token.slice(1));
        const idx = num - 1;
        if (idx >= 0 && idx < input.references.length) {
          referenceMapping[token] = idx;
        }
      }

      let response: N8nResponse;
      try {
        response = await callN8n({
          source: "porto-web",
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          requestId,
          userEmail: ctx.session.user.email ?? null,
          references: referenceImages,
          referenceMapping,
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
          referenceImages,
          referenceMapping,
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
          referenceImages,
          referenceMapping,
        })
        .returning();

      return {
        id: row.id,
        url: publicUrl(fileUrl),
        mimeType,
        requestId,
        createdAt: row.createdAt,
        references: referenceImages,
        referenceMapping,
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

  generateTts: authenticatedProcedure
    .input(generateTtsInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const requestId = randomUUID();
      const settings = await readTtsSettings();
      const provider = input.provider as TtsProviderId;

      if (!settings.ttsEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "TTS belum diaktifkan di AI Settings",
        });
      }

      // Validasi voice sesuai provider. Gemini/Vertex pakai voice set Gemini;
      // OpenRouter (single-voice) divalidasi terhadap voice OpenAI.
      const allowedVoices = new Set(voicesFor(provider, settings.ttsVoiceOptions));
      const normalizedSpeakers = input.speakers.map((speaker) => ({
        speaker: speaker.speaker.trim(),
        voiceName: speaker.voiceName.trim(),
      }));
      for (const speaker of normalizedSpeakers) {
        if (!allowedVoices.has(speaker.voiceName)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Voice tidak diizinkan untuk ${provider}: ${speaker.voiceName}`,
          });
        }
      }

      // Resolusi + dekripsi kredensial provider (lempar bila belum diatur).
      const creds = resolveProviderCreds(settings, provider);

      await assertTtsRateLimit(userId);

      const [row] = await db
        .insert(toolGeneration)
        .values({
          userId,
          kind: "tts",
          prompt: input.text,
          aspectRatio: "audio",
          requestId,
          status: "pending",
          inputMeta: {
            provider,
            model: input.model,
            styleInstruction: input.styleInstruction,
            speakers: normalizedSpeakers,
            format: input.format,
          },
        })
        .returning();

      // Jalankan generasi di background (detached) agar request tidak blocking;
      // frontend memantau via getTtsStatus. Tahan refresh/navigasi.
      void runTtsJob({
        rowId: row.id,
        requestId,
        creds,
        model: input.model,
        script: input.text,
        style: input.styleInstruction,
        speakers: normalizedSpeakers,
        format: input.format,
      });

      return {
        id: row.id,
        requestId,
        status: "pending" as const,
        createdAt: row.createdAt,
        provider,
        model: input.model,
        format: input.format,
      };
    }),

  getTtsStatus: authenticatedProcedure
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
      if (row.kind !== "tts") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Entry bukan TTS" });
      }

      if (row.status === "success") {
        const out = row.outputMeta as { tokens?: TtsTokens } | null;
        return {
          status: "success" as const,
          url: publicUrl(row.fileUrl),
          mimeType: row.mimeType ?? "audio/wav",
          tokens: out?.tokens ?? null,
          createdAt: row.createdAt,
        };
      }
      if (row.status === "error") {
        return {
          status: "error" as const,
          error: row.errorMessage ?? "Generate TTS gagal",
        };
      }

      // pending — reaper: bila terlalu lama (mis. proses mati/restart), tandai error.
      const ageMs = Date.now() - new Date(row.createdAt).getTime();
      if (ageMs > TTS_JOB_TIMEOUT_MS) {
        const message = "TTS timeout — proses tidak selesai. Coba lagi.";
        // Guard status=pending agar tak menimpa worker yang baru saja sukses.
        await db
          .update(toolGeneration)
          .set({ status: "error", errorMessage: message })
          .where(
            and(eq(toolGeneration.id, row.id), eq(toolGeneration.status, "pending")),
          );
        return { status: "error" as const, error: message };
      }
      return { status: "pending" as const };
    }),

  previewTtsVoice: authenticatedProcedure
    .input(
      z.object({
        provider: TTS_PROVIDER.optional().default("gemini"),
        model: z.string().min(1).max(160),
        voiceName: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await readTtsSettings();
      const provider = input.provider as TtsProviderId;
      if (!settings.ttsEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "TTS belum aktif" });
      }
      if (!voicesFor(provider, settings.ttsVoiceOptions).includes(input.voiceName)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Voice tidak diizinkan: ${input.voiceName}`,
        });
      }
      const creds = resolveProviderCreds(settings, provider);

      // Guard preview (in-memory) terpisah dari limit generate.
      assertPreviewRateLimit(ctx.session.user.id);

      try {
        // Ephemeral: tidak disimpan ke history/disk; kembalikan data URL audio.
        if (creds.provider === "openrouter") {
          const { audio, mimeType } = await withTtsRetry(() =>
            callOpenAiAudio({
              baseUrl: OPENROUTER_BASE_URL,
              apiKey: creds.apiKey,
              model: input.model,
              voice: input.voiceName,
              text: TTS_PREVIEW_TEXT,
              format: "mp3",
            }),
          );
          return {
            voiceName: input.voiceName,
            dataUrl: `data:${mimeType};base64,${audio.toString("base64")}`,
          };
        }
        const text = `TTS the following text:\n${TTS_PREVIEW_TEXT}`;
        const speakers = [{ speaker: "Preview", voiceName: input.voiceName }];
        const { pcm } =
          creds.provider === "gemini"
            ? await withTtsRetry(() =>
                callGeminiTts({ apiKey: creds.apiKey, model: input.model, text, speakers }),
              )
            : await withTtsRetry(() =>
                callVertexTts({
                  saJson: creds.saJson,
                  projectId: creds.projectId,
                  location: creds.location,
                  model: input.model,
                  text,
                  speakers,
                }),
              );
        const dataUrl = `data:audio/wav;base64,${wavFromPcm(pcm).toString("base64")}`;
        return { voiceName: input.voiceName, dataUrl };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Preview voice gagal",
        });
      }
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
        if (isRetryableVideoStatusError(status.error)) {
          return {
            status: "pending" as const,
            transientError: status.error,
          };
        }
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

  listMyTtsHistory: authenticatedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(toolGeneration)
      .where(
        and(
          eq(toolGeneration.userId, ctx.session.user.id),
          eq(toolGeneration.kind, "tts"),
        ),
      )
      .orderBy(desc(toolGeneration.createdAt))
      .limit(50);
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

      // Hapus referensi yang ditulis ke disk saat generate (best-effort).
      const refs = Array.isArray(row.referenceImages)
        ? (row.referenceImages as ToolReferenceImage[])
        : [];
      for (const ref of refs) {
        const refUrl = ref.url ?? "";
        const refMatch = refUrl.match(/\/uploads\/tools\/refs\/([^?#/]+)$/);
        if (!refMatch) continue;
        const refBasename = refMatch[1];
        try {
          const refPath = ensureContained(
            path.join(TOOLS_REFS_DIR, refBasename),
            TOOLS_REFS_DIR,
          );
          await fs.unlink(refPath).catch(() => {
            /* sudah tidak ada */
          });
        } catch {
          // skip
        }
      }

      await db.delete(toolGeneration).where(eq(toolGeneration.id, input.id));
      return { ok: true };
    }),
});
