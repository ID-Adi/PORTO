import { JWT } from "google-auth-library";

import {
  DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS,
  DEFAULT_VERTEX_SCOPES,
  DEFAULT_TTS_VOICES,
  OPENAI_TTS_VOICES,
  type TtsProvider,
} from "../db/schema/ai-tool-settings.js";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// 9router (OpenAI-compatible, self-hosted). Re-export agar konsumen lain
// (router/runner) bisa pakai konstanta yang sama tanpa import dari schema.
export { NINE_ROUTER_DEFAULT_BASE_URL } from "../db/schema/ai-tool-settings.js";

// Model TTS Gemini yang dikenal — fallback bila list dari API gagal/ kosong.
const VERTEX_TTS_FALLBACK_MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

export type TtsTokens = {
  total?: number;
  prompt?: number;
  output?: number;
};

export type ProviderModel = { id: string; name: string };

// Error TTS dengan info apakah layak retry (transient). Dipakai lintas adapter.
export class TtsError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "TtsError";
  }
}

export function isRetryableTtsStatus(status: number): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

// Voice set sesuai provider terpilih. Gemini & Vertex pakai voice Gemini
// (dari settings admin, atau default); OpenRouter pakai voice gaya OpenAI.
export function voicesFor(
  provider: TtsProvider,
  geminiVoiceOptions: string[],
): string[] {
  if (provider === "openrouter" || provider === "9router") return [...OPENAI_TTS_VOICES];
  return geminiVoiceOptions.length > 0
    ? geminiVoiceOptions
    : [...DEFAULT_TTS_VOICES];
}

// --- Vertex OAuth (Service Account JSON → access token) ---------------------

type VertexCreds = {
  saJson: string;
  projectId: string;
  location: string;
  httpRequestEnabled?: boolean;
  scopes?: string;
  allowedHttpDomains?: string;
};

// Cache JWT client per service-account JSON; google-auth-library auto-refresh token.
const jwtClientCache = new Map<string, JWT>();

export function normalizeVertexScopes(scopes?: string | null): string[] {
  const values = (scopes?.trim() || DEFAULT_VERTEX_SCOPES)
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return values.length > 0 ? values : [DEFAULT_VERTEX_SCOPES];
}

function vertexJwtClient(saJson: string, scopes?: string | null): JWT {
  const normalizedScopes = normalizeVertexScopes(scopes);
  const cacheKey = `${saJson}:${normalizedScopes.join(" ")}`;
  const cached = jwtClientCache.get(cacheKey);
  if (cached) return cached;
  let parsed: { client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(saJson);
  } catch {
    throw new TtsError("Service Account JSON tidak valid", false);
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new TtsError(
      "Service Account JSON tidak punya client_email/private_key",
      false,
    );
  }
  const client = new JWT({
    email: parsed.client_email,
    key: parsed.private_key,
    scopes: normalizedScopes,
  });
  jwtClientCache.set(cacheKey, client);
  return client;
}

export async function vertexAccessToken(
  saJson: string,
  scopes?: string | null,
): Promise<string> {
  const client = vertexJwtClient(saJson, scopes);
  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error("token kosong");
    return token;
  } catch (err) {
    throw new TtsError(
      err instanceof Error
        ? `Gagal mint token Vertex: ${err.message}`
        : "Gagal mint token Vertex",
      false,
    );
  }
}

export function vertexEndpointHost(location: string): string {
  const normalizedLocation = location.trim() || "us-central1";
  return normalizedLocation.toLowerCase() === "global"
    ? "https://aiplatform.googleapis.com"
    : `https://${normalizedLocation}-aiplatform.googleapis.com`;
}

export function vertexBaseUrl(location: string, projectId: string): string {
  const normalizedLocation = location.trim() || "us-central1";
  return `${vertexEndpointHost(normalizedLocation)}/v1/projects/${projectId}/locations/${normalizedLocation}/publishers/google/models`;
}

function vertexPublisherModelsUrl(location: string): string {
  return `${vertexEndpointHost(location)}/v1beta1/publishers/google/models`;
}

// --- List models (live) -----------------------------------------------------

export type ListModelsArgs =
  | { provider: "gemini"; apiKey: string }
  | { provider: "openrouter"; apiKey: string }
  | { provider: "local"; baseUrl: string }
  | { provider: "9router"; apiKey: string; baseUrl: string }
  | ({ provider: "vertex" } & VertexCreds);

// Strip trailing slash agar penggabungan `${baseUrl}/models` konsisten.
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

// Deteksi model chat dari endpoint OpenAI-compatible lokal (Ollama via Tailscale).
// Tidak ter-filter ke TTS — mengembalikan seluruh model yang diekspos server.
export async function listLocalChatModels(
  baseUrl: string,
): Promise<ProviderModel[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new TtsError(`Local LLM list models HTTP ${res.status}`, false);
  }
  const json = (await res.json()) as {
    data?: Array<{ id?: string; name?: string }>;
  };
  return (json.data ?? [])
    .filter((m) => m.id)
    .map((m) => ({ id: m.id!, name: m.name ?? m.id! }));
}

export async function listProviderModels(
  args: ListModelsArgs,
): Promise<ProviderModel[]> {
  if (args.provider === "gemini") {
    const res = await fetch(`${GEMINI_BASE_URL}/models?pageSize=200`, {
      headers: { "x-goog-api-key": args.apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new TtsError(`Gemini list models HTTP ${res.status}`, false);
    }
    const json = (await res.json()) as {
      models?: Array<{ name?: string; displayName?: string }>;
    };
    return (json.models ?? [])
      .map((m) => ({
        id: (m.name ?? "").replace(/^models\//, ""),
        name: m.displayName ?? (m.name ?? "").replace(/^models\//, ""),
      }))
      .filter((m) => m.id && /tts/i.test(m.id));
  }

  if (args.provider === "openrouter") {
    const res = await fetch(
      `${OPENROUTER_BASE_URL}/models?output_modalities=audio`,
      {
        headers: { Authorization: `Bearer ${args.apiKey}` },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      throw new TtsError(`OpenRouter list models HTTP ${res.status}`, false);
    }
    const json = (await res.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };
    return (json.data ?? [])
      .filter((m) => m.id)
      .map((m) => ({ id: m.id!, name: m.name ?? m.id! }));
  }

  if (args.provider === "local") {
    return listLocalChatModels(args.baseUrl);
  }

  if (args.provider === "9router") {
    // OpenAI-compatible: GET ${baseUrl}/models dengan Bearer key.
    const res = await fetch(`${normalizeBaseUrl(args.baseUrl)}/models`, {
      headers: { Authorization: `Bearer ${args.apiKey}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new TtsError(`9router list models HTTP ${res.status}`, false);
    }
    const json = (await res.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };
    return (json.data ?? [])
      .filter((m) => m.id)
      .map((m) => ({ id: m.id!, name: m.name ?? m.id! }));
  }

  // vertex — pakai probe yang melempar; di sini error ditelan agar UI tetap
  // punya daftar fallback. Untuk uji koneksi, gunakan probeVertexModels langsung.
  try {
    const models = await probeVertexModels(args);
    if (models.length > 0) return models;
  } catch {
    // jatuh ke fallback
  }
  return VERTEX_TTS_FALLBACK_MODELS.map((id) => ({ id, name: id }));
}

// Mint token + query publisher models Vertex. MELEMPAR pada kegagalan (token
// gagal di-mint, HTTP non-2xx). Tidak pernah jatuh ke fallback — dipakai untuk
// uji koneksi yang jujur. Daftar kosong (200 tanpa model TTS) bukan kegagalan.
async function probeVertexModels(
  args: { provider: "vertex" } & VertexCreds,
): Promise<ProviderModel[]> {
  const token = await vertexAccessToken(args.saJson, args.scopes);
  const url = vertexPublisherModelsUrl(args.location);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const detail = body.trim() ? `: ${body.trim().slice(0, 200)}` : "";
    throw new TtsError(
      `Vertex list models HTTP ${res.status}${detail}`,
      isRetryableTtsStatus(res.status),
    );
  }
  const json = (await res.json()) as {
    publisherModels?: Array<{ name?: string; versionId?: string }>;
  };
  return (json.publisherModels ?? [])
    .map((m) => (m.name ?? "").replace(/^publishers\/google\/models\//, ""))
    .filter((id) => id && /tts/i.test(id))
    .map((id) => ({ id, name: id }));
}

export function normalizeVertexAllowedHttpDomains(
  value?: string | null,
): string {
  return value?.trim() || DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS;
}

// --- Test connection --------------------------------------------------------

export type TestProviderArgs = ListModelsArgs;

export async function testProvider(args: TestProviderArgs): Promise<void> {
  // Vertex: probe langsung tanpa fallback agar kredensial salah benar-benar
  // tertangkap (listProviderModels menelan error vertex demi fallback UI).
  if (args.provider === "vertex") {
    await probeVertexModels(args);
    return;
  }
  // Provider lain sudah melempar pada HTTP non-2xx di listProviderModels.
  await listProviderModels(args);
}
