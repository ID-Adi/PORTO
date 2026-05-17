CREATE TABLE "experience_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"title" text NOT NULL,
	"employment_type" text,
	"period" text,
	"period_start" text,
	"period_end" text,
	"description" text,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiences" RENAME TO "experience_companies";--> statement-breakpoint
ALTER TABLE "experience_companies" RENAME COLUMN "period" TO "name";--> statement-breakpoint
ALTER TABLE "experience_companies" RENAME COLUMN "title" TO "location";--> statement-breakpoint
ALTER TABLE "experience_companies" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "experience_companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "experience_companies" ADD COLUMN "is_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_positions" ADD CONSTRAINT "experience_positions_company_id_experience_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."experience_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_companies" DROP COLUMN "detail";