CREATE TABLE IF NOT EXISTS "comment_reactions" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reactions_comment_id_user_id_emoji_pk" PRIMARY KEY("comment_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_description_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"author_id" uuid NOT NULL,
	"content_json" jsonb NOT NULL,
	"restored_from_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_issue_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_description_revisions" ADD CONSTRAINT "issue_description_revisions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_description_revisions" ADD CONSTRAINT "issue_description_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_description_revisions" ADD CONSTRAINT "issue_description_revisions_restored_from_id_issue_description_revisions_id_fk" FOREIGN KEY ("restored_from_id") REFERENCES "public"."issue_description_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reactions_comment_id_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_description_revisions_issue_id_created_at_idx" ON "issue_description_revisions" USING btree ("issue_id","created_at");--> statement-breakpoint
-- Each existing description becomes its issue's first version, credited to the issue's creator.
INSERT INTO "issue_description_revisions" ("issue_id", "revision", "author_id", "content_json", "created_at", "updated_at")
SELECT "id", "description_revision", "created_by", "description_json",
	CASE WHEN "description_revision" = 0 THEN "created_at" ELSE "updated_at" END,
	CASE WHEN "description_revision" = 0 THEN "created_at" ELSE "updated_at" END
FROM "issues"
WHERE jsonb_array_length(COALESCE("description_json"->'content', '[]'::jsonb)) > 0;
