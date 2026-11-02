import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Personal tokens for scripts and tools such as the MCP server. Only a SHA-256 hash of each token is kept. */
export const apiTokens = pgTable(
    "api_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        tokenHash: text("token_hash").notNull().unique(),
        /** The first characters of the token, shown in the list so people can tell their tokens apart. */
        prefix: text("prefix").notNull(),
        lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("api_tokens_user_id_idx").on(table.userId)],
);
