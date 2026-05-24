CREATE TABLE "tool_generation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"aspect_ratio" text NOT NULL,
	"file_url" text,
	"mime_type" text,
	"file_size" integer,
	"request_id" text,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tool_generation" ADD CONSTRAINT "tool_generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;