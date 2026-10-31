ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_cycle_id_project_cycles_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "issues_cycle_id_idx";
--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN IF EXISTS "cycle_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "project_cycles";
--> statement-breakpoint
DROP TYPE IF EXISTS "cycle_status";
