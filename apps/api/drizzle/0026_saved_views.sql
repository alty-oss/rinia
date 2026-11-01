ALTER TYPE "public"."favorite_kind" ADD VALUE IF NOT EXISTS 'view';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "views" ADD CONSTRAINT "views_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "views_project_id_idx" ON "views" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "views_deleted_at_idx" ON "views" USING btree ("deleted_at");
--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "view_id" uuid;
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_view_id_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."views"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_target_unique";
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_target_unique" UNIQUE NULLS NOT DISTINCT("user_id","kind","project_id","document_id","issue_id","view_id");
