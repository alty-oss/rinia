import type { NextFunction, Request, Response } from "express";
import { authenticateApiToken } from "../features/api-tokens/api-tokens.service";
import { SESSION_COOKIE_NAME } from "../lib/cookies";
import { verifyToken } from "../lib/jwt";
import { asyncHandler } from "./async-handler";

/** The token in `Authorization: Bearer <token>`, "" for a bearer header without one, or undefined without a bearer header. */
export function bearerToken(header: string | undefined): string | undefined {
    const match = /^Bearer(?:\s+(.*))?$/i.exec(header?.trim() ?? "");
    return match ? (match[1] ?? "").trim() : undefined;
}

/**
 * Accepts the session cookie or an API token. A request that sends a token is judged by the token alone, so a
 * revoked token fails even from a browser that also holds a session.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
    const apiToken = bearerToken(req.get("authorization"));
    if (apiToken !== undefined) {
        const user = apiToken ? await authenticateApiToken(apiToken) : null;
        if (!user) {
            res.status(401).json({ error: "Invalid or revoked API token", code: "errors.invalidSession" });
            return;
        }
        req.user = user;
        req.authMethod = "token";
        next();
        return;
    }

    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!token) {
        res.status(401).json({ error: "Not authenticated", code: "errors.notAuthenticated" });
        return;
    }

    try {
        req.user = verifyToken(token);
        req.authMethod = "session";
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired session", code: "errors.invalidSession" });
    }
});

/** For actions only a signed-in person may take, never a script holding an API token. Runs after `requireAuth`. */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
    if (req.authMethod !== "session") {
        res.status(403).json({ error: "API tokens cannot do this", code: "errors.permissionDenied" });
        return;
    }
    next();
}
