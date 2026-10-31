import type { CreateFavoriteInput } from "@rinia/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { favorites, issues, projectDocuments, projectMembers } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { assertProjectMembership } from "../../middleware/project-membership.middleware";

const FAVORITE_WITH = {
    project: { columns: { id: true, name: true, issueKey: true, icon: true, iconAppearance: true } },
    document: { columns: { id: true, title: true, iconAppearance: true } },
    issue: { columns: { id: true, number: true, title: true } },
} as const;

type FavoriteRow = NonNullable<Awaited<ReturnType<typeof findFavorite>>>;

function findFavorite(id: string) {
    return db.query.favorites.findFirst({ where: eq(favorites.id, id), with: FAVORITE_WITH });
}

function toFavorite(row: FavoriteRow) {
    return {
        id: row.id,
        kind: row.kind,
        projectId: row.projectId,
        documentId: row.documentId,
        issueId: row.issueId,
        createdAt: row.createdAt,
        project: row.project,
        document: row.document ?? null,
        issue: row.issue ? { ...row.issue, identifier: `${row.project.issueKey}-${row.issue.number}` } : null,
    };
}

/** The user's favorites, oldest first, skipping projects they no longer belong to. */
export async function listFavorites(userId: string, isAdmin: boolean) {
    const rows = await db.query.favorites.findMany({
        where: eq(favorites.userId, userId),
        orderBy: [asc(favorites.createdAt)],
        with: FAVORITE_WITH,
    });
    if (isAdmin || rows.length === 0) return rows.map(toFavorite);

    const memberships = await db.query.projectMembers.findMany({
        where: and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, [...new Set(rows.map((row) => row.projectId))])),
        columns: { projectId: true },
    });
    const allowed = new Set(memberships.map((membership) => membership.projectId));
    return rows.filter((row) => allowed.has(row.projectId)).map(toFavorite);
}

export async function addFavorite(userId: string, isAdmin: boolean, input: CreateFavoriteInput) {
    await assertProjectMembership(input.projectId, userId, isAdmin);
    const documentId = input.kind === "document" ? input.documentId : null;
    const issueId = input.kind === "issue" ? input.issueId : null;

    if (documentId) {
        const document = await db.query.projectDocuments.findFirst({ where: and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, input.projectId)), columns: { id: true } });
        if (!document) throw new HttpError(404, "Document not found");
    }
    if (issueId) {
        const issue = await db.query.issues.findFirst({ where: and(eq(issues.id, issueId), eq(issues.projectId, input.projectId)), columns: { id: true } });
        if (!issue) throw new HttpError(404, "Issue not found");
    }

    // Favoriting twice is a no-op that returns the existing favorite.
    const [inserted] = await db
        .insert(favorites)
        .values({ userId, kind: input.kind, projectId: input.projectId, documentId, issueId })
        .onConflictDoNothing({ target: [favorites.userId, favorites.kind, favorites.projectId, favorites.documentId, favorites.issueId] })
        .returning({ id: favorites.id });
    const id =
        inserted?.id ??
        (await db.query.favorites.findFirst({
            where: (table, { and: all, eq: equals, isNull }) =>
                all(
                    equals(table.userId, userId),
                    equals(table.kind, input.kind),
                    equals(table.projectId, input.projectId),
                    documentId ? equals(table.documentId, documentId) : isNull(table.documentId),
                    issueId ? equals(table.issueId, issueId) : isNull(table.issueId),
                ),
            columns: { id: true },
        }))?.id;
    const row = id ? await findFavorite(id) : undefined;
    if (!row) throw new HttpError(500, "Could not save the favorite");
    return toFavorite(row);
}

export async function removeFavorite(userId: string, favoriteId: string) {
    const [removed] = await db.delete(favorites).where(and(eq(favorites.id, favoriteId), eq(favorites.userId, userId))).returning({ id: favorites.id });
    if (!removed) throw new HttpError(404, "Favorite not found");
}
