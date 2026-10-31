CREATE TABLE IF NOT EXISTS "project_view_preferences" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_view" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_view_preferences_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "project_view_preferences" ADD CONSTRAINT "project_view_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_view_preferences" ADD CONSTRAINT "project_view_preferences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
