ALTER TABLE "ai_tool_settings" ADD COLUMN "mcp_token_hash" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "mcp_token_last4" text;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "mcp_token_created_at" timestamp;