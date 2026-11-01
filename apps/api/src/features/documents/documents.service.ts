import { resolveLocale, type CreateDocumentInput, type Locale, type UpdateDocumentInput } from "@rinia/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { projectDocuments, projectMembers, users } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { requireUndoWindow } from "../../lib/soft-delete";

const matchingDocument = (projectId: string, documentId: string) =>
    and(
    eq(projectDocuments.projectId, projectId),
    eq(projectDocuments.id, documentId),
    isNull(projectDocuments.deletedAt),
  );

const EMPTY_DOCUMENT_TITLES: Record<Locale, string> = {
  "pt-BR": "Sem título",
  en: "Untitled",
};

export function listDocuments(projectId: string) {
  return db.query.projectDocuments.findMany({
    where: and(eq(projectDocuments.projectId, projectId), isNull(projectDocuments.deletedAt)),
    columns: { contentJson: false },
    orderBy: [asc(projectDocuments.createdAt), asc(projectDocuments.id)],
  });
}

export async function getDocument(projectId: string, documentId: string) {
  const document = await db.query.projectDocuments.findFirst({
    where: matchingDocument(projectId, documentId),
  });
  if (!document) throw new HttpError(404, "Document not found");
  return document;
}

export async function createDocument(
  projectId: string,
  userId: string,
  input: CreateDocumentInput,
) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { locale: true } });
  const title = input.title?.trim() || EMPTY_DOCUMENT_TITLES[resolveLocale(user?.locale)];
  const [document] = await db
    .insert(projectDocuments)
    .values({ projectId, createdBy: userId, ...input, iconAppearance: input.iconAppearance ?? null, title })
    .returning();
  return document;
}

export async function updateDocument(
  projectId: string,
  documentId: string,
  userId: string,
  input: UpdateDocumentInput,
) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { locale: true } });
  const title = input.title.trim() || EMPTY_DOCUMENT_TITLES[resolveLocale(user?.locale)];
  const [document] = await db
    .update(projectDocuments)
    .set({
      title,
      contentJson: input.contentJson,
      ...(input.iconAppearance === undefined ? {} : { iconAppearance: input.iconAppearance }),
      updatedAt: new Date(),
      revision: sql`${projectDocuments.revision} + 1`,
    })
    .where(
      and(
        matchingDocument(projectId, documentId),
        eq(projectDocuments.revision, input.expectedRevision),
      ),
    )
    .returning();
  if (document) return document;
  await getDocument(projectId, documentId);
  throw new HttpError(
    409,
    "This page was updated elsewhere. Your draft has been kept.",
  );
}

export async function deleteDocument(
  projectId: string,
  documentId: string,
  userId: string,
  isAdmin: boolean,
) {
  const document = await getDocument(projectId, documentId);
  if (!isAdmin && document.createdBy !== userId) {
    const owner = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        eq(projectMembers.role, "owner"),
      ),
    });
    if (!owner)
      throw new HttpError(
        403,
        "Only the author or project owner can delete this page",
      );
  }
  const deletedAt = new Date();
  await db.update(projectDocuments).set({ deletedAt }).where(matchingDocument(projectId, documentId));
  return { deletedAt: deletedAt.toISOString() };
}

export async function restoreDocument(projectId: string, documentId: string, deletedAt: Date) {
  requireUndoWindow(deletedAt);
  const [document] = await db.update(projectDocuments).set({ deletedAt: null }).where(and(
    eq(projectDocuments.projectId, projectId),
    eq(projectDocuments.id, documentId),
    eq(projectDocuments.deletedAt, deletedAt),
  )).returning({ id: projectDocuments.id });
  if (!document) throw new HttpError(404, "Document not found or undo window expired");
  return { restored: true };
}
