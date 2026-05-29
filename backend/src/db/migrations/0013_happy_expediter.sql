CREATE TABLE "canvas_documents" (
	"user_id" text PRIMARY KEY NOT NULL,
	"scene_data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_documents" ADD CONSTRAINT "canvas_documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;