import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview";
export const DEFAULT_TTS_VOICE = "Kore";
export const DEFAULT_TTS_VOICES = [
  "Kore",
  "Puck",
  "Charon",
  "Leda",
  "Orus",
  "Aoede",
] as const;

// Set voice gaya OpenAI (dipakai provider OpenRouter untuk TTS single-voice).
export const OPENAI_TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
] as const;

export const DEFAULT_VERTEX_LOCATION = "us-central1";
export const DEFAULT_VERTEX_SCOPES =
  "https://www.googleapis.com/auth/cloud-platform";
export const DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS = "All";
export const DEFAULT_CANVAS_AGENT_MODEL = "gemini-3.1-flash";

// 9router: AI router self-hosted dengan endpoint OpenAI-compatible.
export const NINE_ROUTER_DEFAULT_BASE_URL = "http://localhost:20128/v1";

export type TtsProvider = "gemini" | "vertex" | "openrouter" | "9router";
// Canvas Agent / agent CLI mendukung lebih banyak provider dari TTS.
export type CanvasAgentProviderId =
  | "gemini"
  | "vertex"
  | "openrouter"
  | "local"
  | "9router";

export const aiToolSettings = pgTable("ai_tool_settings", {
  id: integer("id").primaryKey().default(1),
  ttsProvider: text("tts_provider").notNull().default("gemini"),
  ttsModel: text("tts_model").notNull().default(DEFAULT_TTS_MODEL),
  // Provider Gemini (Google AI Studio) — key string.
  ttsApiKeyEncrypted: text("tts_api_key_encrypted"),
  ttsApiKeyLast4: text("tts_api_key_last4"),
  // Provider OpenRouter — key string.
  openrouterApiKeyEncrypted: text("openrouter_api_key_encrypted"),
  openrouterApiKeyLast4: text("openrouter_api_key_last4"),
  // Provider Local LLM (OpenAI-compatible, via Tailscale) — base URL plaintext,
  // tanpa API key (keamanan ditangani jaringan Tailscale).
  localBaseUrl: text("local_base_url"),
  // Provider 9router (OpenAI-compatible, self-hosted) — API key string + base URL.
  nineRouterApiKeyEncrypted: text("nine_router_api_key_encrypted"),
  nineRouterApiKeyLast4: text("nine_router_api_key_last4"),
  nineRouterBaseUrl: text("nine_router_base_url")
    .notNull()
    .default(NINE_ROUTER_DEFAULT_BASE_URL),
  nineRouterImageModels: jsonb("nine_router_image_models")
    .$type<string[]>()
    .notNull()
    .default([]),
  // Flag enable/disable per provider credential (global). Disabled = tidak boleh
  // dipakai walau credential valid. Tidak menghapus credential.
  providerGeminiEnabled: boolean("provider_gemini_enabled")
    .notNull()
    .default(false),
  providerVertexEnabled: boolean("provider_vertex_enabled")
    .notNull()
    .default(false),
  providerOpenrouterEnabled: boolean("provider_openrouter_enabled")
    .notNull()
    .default(false),
  providerLocalEnabled: boolean("provider_local_enabled")
    .notNull()
    .default(false),
  provider9routerEnabled: boolean("provider_9router_enabled")
    .notNull()
    .default(false),
  // Provider Vertex AI (Google Cloud) — service account JSON + project + location.
  vertexServiceAccountEncrypted: text("vertex_service_account_encrypted"),
  vertexProjectId: text("vertex_project_id"),
  vertexLocation: text("vertex_location")
    .notNull()
    .default(DEFAULT_VERTEX_LOCATION),
  vertexHttpRequestEnabled: boolean("vertex_http_request_enabled")
    .notNull()
    .default(true),
  vertexScopes: text("vertex_scopes").notNull().default(DEFAULT_VERTEX_SCOPES),
  vertexAllowedHttpDomains: text("vertex_allowed_http_domains")
    .notNull()
    .default(DEFAULT_VERTEX_ALLOWED_HTTP_DOMAINS),
  ttsDefaultVoice: text("tts_default_voice")
    .notNull()
    .default(DEFAULT_TTS_VOICE),
  ttsVoiceOptions: jsonb("tts_voice_options")
    .$type<string[]>()
    .notNull()
    .default([...DEFAULT_TTS_VOICES]),
  ttsEnabled: boolean("tts_enabled").notNull().default(false),
  canvasAgentEnabled: boolean("canvas_agent_enabled").notNull().default(false),
  canvasAgentProvider: text("canvas_agent_provider").notNull().default("gemini"),
  canvasAgentModel: text("canvas_agent_model")
    .notNull()
    .default(DEFAULT_CANVAS_AGENT_MODEL),
  canvasAgentSystemPrompt: text("canvas_agent_system_prompt"),
  // Token MCP statis untuk agent eksternal (Claude/Cursor). Hanya hash SHA-256
  // yang disimpan; raw token dikembalikan sekali saat generate.
  mcpTokenHash: text("mcp_token_hash"),
  mcpTokenLast4: text("mcp_token_last4"),
  mcpTokenCreatedAt: timestamp("mcp_token_created_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
