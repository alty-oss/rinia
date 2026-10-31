import { primaryKey, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

/**
 * How each user likes to see each project. `issue_view` is plain text rather than an enum so a new view
 * only has to be added to `issueViewValues` in @rinia/shared; values the app no longer knows read as the default.
 */
export const projectViewPreferences = pgTable(
    "project_view_preferences",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        issueView: text("issue_view").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.projectId] })],
);
