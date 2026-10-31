ALTER TYPE "public"."issue_priority" ADD VALUE IF NOT EXISTS 'none' BEFORE 'low';--> statement-breakpoint
ALTER TYPE "public"."issue_priority" ADD VALUE IF NOT EXISTS 'urgent' AFTER 'high';
