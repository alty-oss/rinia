import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/** Keys a project used before it was renamed. Old issue identifiers such as `OLD-12` keep resolving, and no other project can take the key. */
export const projectKeyAliases = pgTable(
    "project_key_aliases",
    {
        key: text("key").primaryKey(),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("project_key_aliases_project_id_idx").on(table.projectId)],
);
