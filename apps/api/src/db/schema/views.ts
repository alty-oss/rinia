import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SavedViewFilters } from "@rinia/shared";
import { projects } from "./projects";
import { users } from "./users";

/**
 * A named combination of the issue page's URL parameters. Private by default; `shared` shows it to every
 * member of the project. `filters` holds the query-string values, so a view only needs the parameters the
 * issue page already understands.
 */
export const views = pgTable(
    "views",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        ownerId: uuid("owner_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        shared: boolean("shared").notNull().default(false),
        filters: jsonb("filters").$type<SavedViewFilters>().notNull().default({}),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    (table) => [index("views_project_id_idx").on(table.projectId), index("views_deleted_at_idx").on(table.deletedAt)],
);
