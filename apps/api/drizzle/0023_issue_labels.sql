CREATE TABLE IF NOT EXISTS "issue_labels" (
	"issue_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_labels_issue_id_category_id_pk" PRIMARY KEY("issue_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_labels_category_id_idx" ON "issue_labels" USING btree ("category_id");--> statement-breakpoint
-- Every issue keeps the label it had, now as its first of possibly several.
INSERT INTO "issue_labels" ("issue_id", "category_id", "created_at")
SELECT "id", "category_id", "created_at" FROM "issues" WHERE "category_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE 'label_added';--> statement-breakpoint
ALTER TYPE "public"."issue_activity_type" ADD VALUE 'label_removed';--> statement-breakpoint
DROP INDEX IF EXISTS "issues_category_id_idx";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN IF EXISTS "category_id";
