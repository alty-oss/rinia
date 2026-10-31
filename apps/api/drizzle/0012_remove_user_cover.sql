ALTER TABLE "users" DROP COLUMN IF EXISTS "cover";
--> statement-breakpoint
UPDATE "projects"
SET "cover" = NULL
WHERE "cover" IS NOT NULL
  AND COALESCE("cover"->>'type', '') <> 'gradient';
