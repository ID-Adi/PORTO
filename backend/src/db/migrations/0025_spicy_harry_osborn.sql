ALTER TABLE "ai_tool_settings" ADD COLUMN "nine_router_api_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "nine_router_api_key_last4" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "nine_router_base_url" text DEFAULT 'http://localhost:20128/v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "provider_gemini_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "provider_vertex_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "provider_openrouter_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "provider_local_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "provider_9router_enabled" boolean DEFAULT false NOT NULL;