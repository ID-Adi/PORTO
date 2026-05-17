ALTER TABLE "media" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "uploaded_by" text;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_url_unique" UNIQUE("url");