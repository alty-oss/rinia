import { index, jsonb, pgEnum, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationTypeValues } from "@rinia/shared";
import { issueComments } from "./issue-comments";
import { issues } from "./issues";
import { projects } from "./projects";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", notificationTypeValues);

/**
 * One entry in a user's inbox. `project_id` repeats the issue's project so the inbox can hide projects the
 * user has left with a plain filter. Deleting the issue, comment, or project removes the notification with it.
 */
export const notifications = pgTable(
    "notifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        actorId: uuid("actor_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: notificationTypeEnum("type").notNull(),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        issueId: uuid("issue_id")
            .notNull()
            .references(() => issues.id, { onDelete: "cascade" }),
        commentId: uuid("comment_id").references(() => issueComments.id, { onDelete: "cascade" }),
        payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
        readAt: timestamp("read_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("notifications_user_id_created_at_idx").on(table.userId, table.createdAt)],
);

/** Who follows an issue. Followers hear about its comments and state changes. */
export const issueSubscriptions = pgTable(
    "issue_subscriptions",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        issueId: uuid("issue_id")
            .notNull()
            .references(() => issues.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.issueId] }), index("issue_subscriptions_issue_id_idx").on(table.issueId)],
);
