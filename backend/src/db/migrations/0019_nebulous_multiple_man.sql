CREATE TABLE "canvas_agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"user_message_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_agent_runs" ADD CONSTRAINT "canvas_agent_runs_workflow_id_canvas_agent_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."canvas_agent_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_agent_runs" ADD CONSTRAINT "canvas_agent_runs_user_message_id_canvas_agent_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."canvas_agent_messages"("id") ON DELETE cascade ON UPDATE no action;