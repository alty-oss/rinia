import { AsyncLocalStorage } from "node:async_hooks";
import { REALTIME_CLIENT_HEADER } from "@rinia/shared";
import type { NextFunction, Request, Response } from "express";

const storage = new AsyncLocalStorage<Request>();

/** Keeps the request reachable from services, so realtime events can say who made a change without threading it through every call. */
export function requestContext(req: Request, _res: Response, next: NextFunction): void {
    storage.run(req, next);
}

/** Who caused the change being handled: the signed-in user and the tab they sent it from. Both are null outside a request. */
export function currentOrigin(): { actorId: string | null; clientId: string | null } {
    const req = storage.getStore();
    const clientId = req?.get(REALTIME_CLIENT_HEADER);
    return { actorId: req?.user?.sub ?? null, clientId: clientId && clientId.length <= 64 ? clientId : null };
}
