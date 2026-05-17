ALTER TABLE "skills" ALTER COLUMN "level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "skills" ALTER COLUMN "level" SET DATA TYPE integer USING CASE "level" WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 3 WHEN 'advanced' THEN 4 WHEN 'expert' THEN 5 ELSE 3 END;--> statement-breakpoint
ALTER TABLE "skills" ALTER COLUMN "level" SET DEFAULT 3;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "years" integer;