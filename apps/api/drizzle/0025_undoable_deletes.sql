ALTER TABLE "issues" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "project_documents" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "issue_comments" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "issues_deleted_at_idx" ON "issues" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "project_documents_deleted_at_idx" ON "project_documents" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "issue_comments_deleted_at_idx" ON "issue_comments" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "favorites_deleted_at_idx" ON "favorites" USING btree ("deleted_at");
