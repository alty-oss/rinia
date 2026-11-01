import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { issueComments } from "./issue-comments";
import { users } from "./users";

/** One person's emoji on a comment. Each person can add each emoji once per comment. */
export const commentReactions = pgTable(
    "comment_reactions",
    {
        commentId: uuid("comment_id")
            .notNull()
            .references(() => issueComments.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        emoji: text("emoji").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.commentId, table.userId, table.emoji] }), index("comment_reactions_comment_id_idx").on(table.commentId)],
);
