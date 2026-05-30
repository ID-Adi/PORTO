ALTER TABLE "ai_tool_settings" ADD COLUMN "openrouter_api_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "openrouter_api_key_last4" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_service_account_encrypted" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_project_id" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_location" text DEFAULT 'us-central1' NOT NULL;