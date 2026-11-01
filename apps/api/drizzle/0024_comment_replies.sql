ALTER TABLE "issue_comments" ADD COLUMN "parent_comment_id" uuid;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_parent_comment_id_issue_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."issue_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_comments_parent_comment_id_idx" ON "issue_comments" USING btree ("parent_comment_id");--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'replied' AFTER 'mentioned';
