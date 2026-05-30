CREATE TABLE "canvas_agent_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"frame_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_agent_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"created_from_message_id" integer,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"summary" text NOT NULL,
	"frame_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_agent_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"active_frame_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "canvas_agent_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "canvas_agent_provider" text DEFAULT 'gemini' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "canvas_agent_model" text DEFAULT 'gemini-3.1-flash' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tool_settings" ADD COLUMN "canvas_agent_system_prompt" text;--> statement-breakpoint
ALTER TABLE "canvas_agent_messages" ADD CONSTRAINT "canvas_agent_messages_workflow_id_canvas_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."canvas_agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_agent_proposals" ADD CONSTRAINT "canvas_agent_proposals_workflow_id_canvas_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."canvas_agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_agent_proposals" ADD CONSTRAINT "canvas_agent_proposals_created_from_message_id_canvas_agent_messages_id_fk" FOREIGN KEY ("created_from_message_id") REFERENCES "public"."canvas_agent_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_agent_workflows" ADD CONSTRAINT "canvas_agent_workflows_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;