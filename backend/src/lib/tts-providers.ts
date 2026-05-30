import { JWT } from "google-auth-library";

import {
  DEFAULT_TTS_VOICES,
  OPENAI_TTS_VOICES,
  type TtsProvider,
} from "../db/schema/ai-tool-settings.js";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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
  if (provider === "openrouter") return [...OPENAI_TTS_VOICES];
  return geminiVoiceOptions.length > 0
    ? geminiVoiceOptions
    : [...DEFAULT_TTS_VOICES];
}

// --- Vertex OAuth (Service Account JSON → access token) ---------------------

type VertexCreds = {
  saJson: string;
  projectId: string;
  location: string;
};

// Cache JWT client per service-account JSON; google-auth-library auto-refresh token.
const jwtClientCache = new Map<string, JWT>();

function vertexJwtClient(saJson: string): JWT {
  const cached = jwtClientCache.get(saJson);
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
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  jwtClientCache.set(saJson, client);
  return client;
}

export async function vertexAccessToken(saJson: string): Promise<string> {
  const client = vertexJwtClient(saJson);
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

export function vertexBaseUrl(location: string, projectId: string): string {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;
}

// --- List models (live) -----------------------------------------------------

export type ListModelsArgs =
  | { provider: "gemini"; apiKey: string }
  | { provider: "openrouter"; apiKey: string }
  | ({ provider: "vertex" } & VertexCreds);

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

  // vertex
  try {
    const token = await vertexAccessToken(args.saJson);
    const url = `https://${args.location}-aiplatform.googleapis.com/v1beta1/publishers/google/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        publisherModels?: Array<{ name?: string; versionId?: string }>;
      };
      const models = (json.publisherModels ?? [])
        .map((m) => (m.name ?? "").replace(/^publishers\/google\/models\//, ""))
        .filter((id) => id && /tts/i.test(id))
        .map((id) => ({ id, name: id }));
      if (models.length > 0) return models;
    }
  } catch {
    // jatuh ke fallback
  }
  return VERTEX_TTS_FALLBACK_MODELS.map((id) => ({ id, name: id }));
}

// --- Test connection --------------------------------------------------------

export type TestProviderArgs = ListModelsArgs;

export async function testProvider(args: TestProviderArgs): Promise<void> {
  // Reuse list endpoint sebagai uji koneksi/kredensial.
  await listProviderModels(args);
}
