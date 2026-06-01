ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_http_request_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_scopes" text DEFAULT 'https://www.googleapis.com/auth/cloud-platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "vertex_allowed_http_domains" text DEFAULT 'All' NOT NULL;