import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { issues } from "./issues";

/** The labels on an issue. Deleting either the issue or the label removes the link. */
export const issueLabels = pgTable(
    "issue_labels",
    {
        issueId: uuid("issue_id")
            .notNull()
            .references(() => issues.id, { onDelete: "cascade" }),
        categoryId: uuid("category_id")
            .notNull()
            .references(() => categories.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.issueId, table.categoryId] }), index("issue_labels_category_id_idx").on(table.categoryId)],
);
