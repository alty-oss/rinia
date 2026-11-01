ALTER TABLE "issues" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE 'due_date_changed' AFTER 'estimate_changed';
