CREATE TABLE "profile_overview" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" text DEFAULT 'left' NOT NULL,
	"icon" text NOT NULL,
	"value" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"copyable" boolean DEFAULT false NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "socials" ADD COLUMN "icon_url" text;