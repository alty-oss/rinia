import { HttpError } from "./http-error";

export const SOFT_DELETE_RETENTION_MS = 24 * 60 * 60 * 1000;

export function requireUndoWindow(deletedAt: Date) {
    if (!Number.isFinite(deletedAt.getTime()) || deletedAt.getTime() < Date.now() - SOFT_DELETE_RETENTION_MS) {
        throw new HttpError(404, "Undo window expired");
    }
}
