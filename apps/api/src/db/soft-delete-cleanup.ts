import { and, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "./index";
import { favorites, issueComments, issues, projectDocuments } from "./schema";
import { SOFT_DELETE_RETENTION_MS } from "../lib/soft-delete";

/** Permanently removes undoable deletions after their recovery window has elapsed. */
export async function cleanupExpiredDeletes(now = new Date()) {
    const cutoff = new Date(now.getTime() - SOFT_DELETE_RETENTION_MS);
    await db.delete(favorites).where(and(isNotNull(favorites.deletedAt), lt(favorites.deletedAt, cutoff)));
    await db.delete(projectDocuments).where(and(isNotNull(projectDocuments.deletedAt), lt(projectDocuments.deletedAt, cutoff)));
    await db.delete(issueComments).where(and(isNotNull(issueComments.deletedAt), lt(issueComments.deletedAt, cutoff)));

    const expiredIssues = await db.query.issues.findMany({
        where: and(isNotNull(issues.deletedAt), lt(issues.deletedAt, cutoff)),
        columns: { id: true },
    });
    const ids = expiredIssues.map((issue) => issue.id);
    if (!ids.length) return;
    await db.update(issues).set({ parentIssueId: null }).where(inArray(issues.parentIssueId, ids));
    await db.delete(issues).where(inArray(issues.id, ids));
}
