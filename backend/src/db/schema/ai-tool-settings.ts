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

export type TtsProvider = "gemini" | "vertex" | "openrouter";

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
  // Provider Vertex AI (Google Cloud) — service account JSON + project + location.
  vertexServiceAccountEncrypted: text("vertex_service_account_encrypted"),
  vertexProjectId: text("vertex_project_id"),
  vertexLocation: text("vertex_location")
    .notNull()
    .default(DEFAULT_VERTEX_LOCATION),
  ttsDefaultVoice: text("tts_default_voice")
    .notNull()
    .default(DEFAULT_TTS_VOICE),
  ttsVoiceOptions: jsonb("tts_voice_options")
    .$type<string[]>()
    .notNull()
    .default([...DEFAULT_TTS_VOICES]),
  ttsEnabled: boolean("tts_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
