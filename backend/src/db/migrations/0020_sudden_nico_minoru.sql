CREATE TABLE "mcp_action_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by" text,
	"approved_by" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_action_requests" ADD CONSTRAINT "mcp_action_requests_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_action_requests" ADD CONSTRAINT "mcp_action_requests_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;