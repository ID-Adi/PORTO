CREATE TABLE "ai_tool_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"tts_provider" text DEFAULT 'gemini' NOT NULL,
	"tts_model" text DEFAULT 'gemini-3.1-flash-tts-preview' NOT NULL,
	"tts_api_key_encrypted" text,
	"tts_api_key_last4" text,
	"tts_default_voice" text DEFAULT 'Kore' NOT NULL,
	"tts_voice_options" jsonb DEFAULT '["Kore","Puck","Charon","Leda","Orus","Aoede"]'::jsonb NOT NULL,
	"tts_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tool_generation" ADD COLUMN "input_meta" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_generation" ADD COLUMN "output_meta" jsonb DEFAULT '{}'::jsonb NOT NULL;