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

export type TtsProvider = "gemini";

export const aiToolSettings = pgTable("ai_tool_settings", {
  id: integer("id").primaryKey().default(1),
  ttsProvider: text("tts_provider").notNull().default("gemini"),
  ttsModel: text("tts_model").notNull().default(DEFAULT_TTS_MODEL),
  ttsApiKeyEncrypted: text("tts_api_key_encrypted"),
  ttsApiKeyLast4: text("tts_api_key_last4"),
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
