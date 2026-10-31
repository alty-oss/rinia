CREATE TABLE IF NOT EXISTS "project_key_aliases" (
	"key" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_key_aliases" ADD CONSTRAINT "project_key_aliases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_key_aliases_project_id_idx" ON "project_key_aliases" USING btree ("project_id");
