import { index, pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { favoriteKindValues } from "@rinia/shared";
import { issues } from "./issues";
import { projectDocuments } from "./project-documents";
import { projects } from "./projects";
import { users } from "./users";

export const favoriteKindEnum = pgEnum("favorite_kind", favoriteKindValues);

/** A user's pinned shortcut. Each target column cascades, so deleting the item removes the favorite with it. */
export const favorites = pgTable(
    "favorites",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        kind: favoriteKindEnum("kind").notNull(),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        documentId: uuid("document_id").references(() => projectDocuments.id, { onDelete: "cascade" }),
        issueId: uuid("issue_id").references(() => issues.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        unique("favorites_target_unique").on(table.userId, table.kind, table.projectId, table.documentId, table.issueId).nullsNotDistinct(),
        index("favorites_user_id_idx").on(table.userId),
    ],
);
