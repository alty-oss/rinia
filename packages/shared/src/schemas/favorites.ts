import { z } from "zod";

export const favoriteKindValues = ["project", "issues", "document", "issue"] as const;
export type FavoriteKind = (typeof favoriteKindValues)[number];

const projectId = z.string().uuid();

/** What a favorite points at: a project, its issue list, one document, or one issue. */
export const createFavoriteSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("project"), projectId }),
    z.object({ kind: z.literal("issues"), projectId }),
    z.object({ kind: z.literal("document"), projectId, documentId: z.string().uuid() }),
    z.object({ kind: z.literal("issue"), projectId, issueId: z.string().uuid() }),
]);
export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
