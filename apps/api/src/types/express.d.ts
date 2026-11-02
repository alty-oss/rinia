import type { projectMembers } from "../db/schema";
import type { JwtPayload } from "../lib/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            /** How `user` signed in: the browser session cookie or an API token. */
            authMethod?: "session" | "token";
            projectMembership?: typeof projectMembers.$inferSelect;
        }
    }
}

export {};
