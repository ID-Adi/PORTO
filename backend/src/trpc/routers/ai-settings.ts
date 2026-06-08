import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  aiToolSettings,
  DEFAULT_CANVAS_AGENT_MODEL,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_VOICES,
  DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_SCOPES,
  NINE_ROUTER_DEFAULT_BASE_URL,
} from "../../db/schema/index.js";
import { decryptSecret, encryptSecret } from "../../lib/encrypted-secret.js";
import { testProvider, type ListModelsArgs } from "../../lib/tts-providers.js";
import { protectedProcedure, router } from "../init.js";

const SINGLETON_ID = 1;

type AiToolSettingsRow = typeof aiToolSettings.$inferSelect;

const TTS_PROVIDER = z.enum(["gemini", "vertex", "openrouter"]);
// Canvas Agent mendukung lebih banyak provider (Local & 9router) dari TTS.
const AGENT_PROVIDER = z.enum([
  "gemini",
  "vertex",
  "openrouter",
  "local",
  "9router",
]);

// Settings umum (enable, model default, voice) — TANPA key (key via updateProviderKey).
const ttsConfigInput = z.object({
  ttsProvider: TTS_PROVIDER.optional().default("gemini"),
  ttsModel: z.string().min(1).max(160),
  ttsDefaultVoice: z.string().min(1).max(80),
  ttsVoiceOptions: z.array(z.string().min(1).max(80)).min(1).max(30),
  ttsEnabled: z.boolean(),
  canvasAgentEnabled: z.boolean().optional().default(false),
  canvasAgentProvider: AGENT_PROVIDER.optional().default("gemini"),
  canvasAgentModel: z.string().min(1).max(160).optional().default(DEFAULT_CANVAS_AGENT_MODEL),
  canvasAgentSystemPrompt: z.string().max(8000).optional().nullable(),
});

// Kredensial per provider (dipakai untuk Save & Test di modal).
const providerCredsInput = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("gemini"), apiKey: z.string().min(8).max(400) }),
  z.object({ provider: z.literal("openrouter"), apiKey: z.string().min(8).max(400) }),
  z.object({ provider: z.literal("local"), baseUrl: z.url().max(500) }),
  z.object({
    provider: z.literal("9router"),
    apiKey: z.string().min(8).max(400),
    baseUrl: z.url().max(500).optional().default(NINE_ROUTER_DEFAULT_BASE_URL),
  }),
  z.object({
    provider: z.literal("vertex"),
    // Opsional: bila kosong & SA sudah tersimpan, hanya update project/location.
    serviceAccount: z.string().min(20).max(20000).optional(),
    projectId: z.string().min(1).max(200),
    location: z.string().min(1).max(60).optional().default(DEFAULT_VERTEX_LOCATION),
    httpRequestEnabled: z.boolean().optional().default(true),
    scopes: z.string().min(1).max(1000).optional().default(DEFAULT_VERTEX_SCOPES),
    allowedHttpDomains: z
      .string()
      .min(1)
      .max(1000)
      .optional()
      .default(DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS),
  }),
]);

// Untuk Test: secret boleh kosong → pakai yang tersimpan.
const testProviderInput = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("gemini"), apiKey: z.string().max(400).optional() }),
  z.object({ provider: z.literal("openrouter"), apiKey: z.string().max(400).optional() }),
  z.object({ provider: z.literal("local"), baseUrl: z.string().max(500).optional() }),
  z.object({
    provider: z.literal("9router"),
    apiKey: z.string().max(400).optional(),
    baseUrl: z.string().max(500).optional(),
  }),
  z.object({
    provider: z.literal("vertex"),
    serviceAccount: z.string().max(20000).optional(),
    projectId: z.string().max(200).optional(),
    location: z.string().max(60).optional(),
    httpRequestEnabled: z.boolean().optional(),
    scopes: z.string().max(1000).optional(),
    allowedHttpDomains: z.string().max(1000).optional(),
  }),
]);

function publicConfig(row: AiToolSettingsRow) {
  return {
    id: row.id,
    ttsProvider: row.ttsProvider,
    ttsModel: row.ttsModel,
    ttsDefaultVoice: row.ttsDefaultVoice,
    ttsVoiceOptions: row.ttsVoiceOptions,
    ttsEnabled: row.ttsEnabled,
    canvasAgentEnabled: row.canvasAgentEnabled,
    canvasAgentProvider: row.canvasAgentProvider,
    canvasAgentModel: row.canvasAgentModel,
    canvasAgentSystemPrompt: row.canvasAgentSystemPrompt,
    // Per-provider (tak pernah kirim secret plaintext). `enabled` = flag global
    // yang menentukan apakah provider boleh dipakai walau credential valid.
    gemini: {
      hasApiKey: Boolean(row.ttsApiKeyEncrypted),
      last4: row.ttsApiKeyLast4,
      enabled: row.providerGeminiEnabled,
    },
    openrouter: {
      hasApiKey: Boolean(row.openrouterApiKeyEncrypted),
      last4: row.openrouterApiKeyLast4,
      enabled: row.providerOpenrouterEnabled,
    },
    local: {
      configured: Boolean(row.localBaseUrl),
      baseUrl: row.localBaseUrl,
      enabled: row.providerLocalEnabled,
    },
    vertex: {
      hasApiKey: Boolean(row.vertexServiceAccountEncrypted && row.vertexProjectId),
      projectId: row.vertexProjectId,
      location: row.vertexLocation,
      httpRequestEnabled: row.vertexHttpRequestEnabled,
      scopes: row.vertexScopes,
      allowedHttpDomains: row.vertexAllowedHttpDomains,
      enabled: row.providerVertexEnabled,
    },
    nineRouter: {
      hasApiKey: Boolean(row.nineRouterApiKeyEncrypted),
      last4: row.nineRouterApiKeyLast4,
      baseUrl: row.nineRouterBaseUrl,
      enabled: row.provider9routerEnabled,
    },
    // Kompat lama.
    ttsApiKeyLast4: row.ttsApiKeyLast4,
    hasTtsApiKey: Boolean(row.ttsApiKeyEncrypted),
    updatedAt: row.updatedAt,
  };
}

async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, SINGLETON_ID))
    .limit(1);

  if (existing) return existing;

  const [row] = await db
    .insert(aiToolSettings)
    .values({
      id: SINGLETON_ID,
      ttsProvider: "gemini",
      ttsModel: DEFAULT_TTS_MODEL,
      ttsDefaultVoice: DEFAULT_TTS_VOICE,
      ttsVoiceOptions: [...DEFAULT_TTS_VOICES],
      ttsEnabled: false,
      canvasAgentEnabled: false,
      canvasAgentProvider: "gemini",
      canvasAgentModel: DEFAULT_CANVAS_AGENT_MODEL,
    })
    .returning();
  return row;
}

// Susun kredensial provider untuk uji koneksi: pakai input modal bila ada,
// jika tidak ada pakai yang tersimpan (decrypt).
function buildTestCreds(
  input: z.infer<typeof testProviderInput>,
  row: AiToolSettingsRow,
): ListModelsArgs {
  if (input.provider === "gemini") {
    const apiKey =
      input.apiKey?.trim() ||
      (row.ttsApiKeyEncrypted ? decryptSecret(row.ttsApiKeyEncrypted) : "");
    if (!apiKey) throw new Error("Gemini API key belum diisi");
    return { provider: "gemini", apiKey };
  }
  if (input.provider === "openrouter") {
    const apiKey =
      input.apiKey?.trim() ||
      (row.openrouterApiKeyEncrypted
        ? decryptSecret(row.openrouterApiKeyEncrypted)
        : "");
    if (!apiKey) throw new Error("OpenRouter API key belum diisi");
    return { provider: "openrouter", apiKey };
  }
  if (input.provider === "local") {
    const baseUrl = input.baseUrl?.trim() || row.localBaseUrl || "";
    if (!baseUrl) throw new Error("Base URL Local LLM belum diisi");
    return { provider: "local", baseUrl };
  }
  if (input.provider === "9router") {
    const apiKey =
      input.apiKey?.trim() ||
      (row.nineRouterApiKeyEncrypted
        ? decryptSecret(row.nineRouterApiKeyEncrypted)
        : "");
    if (!apiKey) throw new Error("9router API key belum diisi");
    const baseUrl =
      input.baseUrl?.trim() ||
      row.nineRouterBaseUrl ||
      NINE_ROUTER_DEFAULT_BASE_URL;
    return { provider: "9router", apiKey, baseUrl };
  }
  // vertex
  const saJson =
    input.serviceAccount?.trim() ||
    (row.vertexServiceAccountEncrypted
      ? decryptSecret(row.vertexServiceAccountEncrypted)
      : "");
  const projectId = input.projectId?.trim() || row.vertexProjectId || "";
  const location = input.location?.trim() || row.vertexLocation || DEFAULT_VERTEX_LOCATION;
  const scopes = input.scopes?.trim() || row.vertexScopes || DEFAULT_VERTEX_SCOPES;
  const allowedHttpDomains =
    input.allowedHttpDomains?.trim() ||
    row.vertexAllowedHttpDomains ||
    DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS;
  if (!saJson || !projectId) {
    throw new Error("Service Account JSON / Project ID belum diisi");
  }
  return {
    provider: "vertex",
    saJson,
    projectId,
    location,
    httpRequestEnabled:
      input.httpRequestEnabled ?? row.vertexHttpRequestEnabled ?? true,
    scopes,
    allowedHttpDomains,
  };
}

export const aiSettingsRouter = router({
  getTtsConfig: protectedProcedure.query(async () => {
    return publicConfig(await getOrCreateSettings());
  }),

  updateTtsConfig: protectedProcedure
    .input(ttsConfigInput)
    .mutation(async ({ input }) => {
      const existing = await getOrCreateSettings();
      const [row] = await db
        .update(aiToolSettings)
        .set({
          ttsProvider: input.ttsProvider,
          ttsModel: input.ttsModel,
          ttsDefaultVoice: input.ttsDefaultVoice,
          ttsVoiceOptions: input.ttsVoiceOptions,
          ttsEnabled: input.ttsEnabled,
          canvasAgentEnabled: input.canvasAgentEnabled,
          canvasAgentProvider: input.canvasAgentProvider,
          canvasAgentModel: input.canvasAgentModel,
          canvasAgentSystemPrompt: input.canvasAgentSystemPrompt?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(aiToolSettings.id, existing.id))
        .returning();
      return publicConfig(row);
    }),

  // Simpan kredensial satu provider (dipakai tombol Save di modal).
  updateProviderKey: protectedProcedure
    .input(providerCredsInput)
    .mutation(async ({ input }) => {
      const existing = await getOrCreateSettings();
      let patch: Partial<AiToolSettingsRow>;
      if (input.provider === "gemini") {
        const key = input.apiKey.trim();
        patch = {
          ttsApiKeyEncrypted: encryptSecret(key),
          ttsApiKeyLast4: key.slice(-4),
        };
      } else if (input.provider === "openrouter") {
        const key = input.apiKey.trim();
        patch = {
          openrouterApiKeyEncrypted: encryptSecret(key),
          openrouterApiKeyLast4: key.slice(-4),
        };
      } else if (input.provider === "local") {
        // Base URL disimpan plaintext (host privat Tailscale, bukan secret).
        patch = { localBaseUrl: input.baseUrl.trim() };
      } else if (input.provider === "9router") {
        // API key di-encrypt; base URL plaintext (bukan secret).
        const key = input.apiKey.trim();
        patch = {
          nineRouterApiKeyEncrypted: encryptSecret(key),
          nineRouterApiKeyLast4: key.slice(-4),
          nineRouterBaseUrl:
            input.baseUrl.trim() || NINE_ROUTER_DEFAULT_BASE_URL,
        };
      } else {
        const sa = input.serviceAccount?.trim();
        if (!sa && !existing.vertexServiceAccountEncrypted) {
          throw new Error("Service Account JSON wajib diisi");
        }
        patch = {
          // Pertahankan SA lama bila tidak diisi ulang.
          ...(sa ? { vertexServiceAccountEncrypted: encryptSecret(sa) } : {}),
          vertexProjectId: input.projectId.trim(),
          vertexLocation: input.location.trim() || DEFAULT_VERTEX_LOCATION,
          vertexHttpRequestEnabled: input.httpRequestEnabled,
          vertexScopes: input.scopes.trim() || DEFAULT_VERTEX_SCOPES,
          vertexAllowedHttpDomains:
            input.allowedHttpDomains.trim() ||
            DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS,
        };
      }
      const [row] = await db
        .update(aiToolSettings)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(aiToolSettings.id, existing.id))
        .returning();
      return publicConfig(row);
    }),

  // Enable/disable penggunaan provider (global). Tidak menyentuh credential.
  updateProviderEnabled: protectedProcedure
    .input(
      z.object({
        provider: AGENT_PROVIDER,
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await getOrCreateSettings();
      const column = {
        gemini: "providerGeminiEnabled",
        vertex: "providerVertexEnabled",
        openrouter: "providerOpenrouterEnabled",
        local: "providerLocalEnabled",
        "9router": "provider9routerEnabled",
      } as const satisfies Record<
        z.infer<typeof AGENT_PROVIDER>,
        keyof AiToolSettingsRow
      >;
      const patch: Partial<AiToolSettingsRow> = {
        [column[input.provider]]: input.enabled,
      };
      const [row] = await db
        .update(aiToolSettings)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(aiToolSettings.id, existing.id))
        .returning();
      return publicConfig(row);
    }),

  // Uji koneksi provider (pakai key yang diketik di modal bila ada).
  testProviderConnection: protectedProcedure
    .input(testProviderInput)
    .mutation(async ({ input }) => {
      const row = await getOrCreateSettings();
      try {
        const creds = buildTestCreds(input, row);
        await testProvider(creds);
        return { ok: true as const };
      } catch (err) {
        return {
          ok: false as const,
          message: err instanceof Error ? err.message : "Koneksi gagal",
        };
      }
    }),
});
