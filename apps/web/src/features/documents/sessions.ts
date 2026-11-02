import type { QueryClient } from "@tanstack/react-query";
import { type DocumentPage, type DocumentSummary, saveDocument } from "./api";
import { forgetLocalDatabases, localDatabasePrefix, rememberedLocalDatabases } from "./collab/document-provider";
import { DocumentSession } from "./document-session";
import { documentKey, documentsKey } from "./hooks/use-documents";

const sessions = new Map<string, DocumentSession>();
const keyOf = (userId: string, projectId: string, documentId: string) => `${userId}:${projectId}:${documentId}`;
export function getDocumentSession(userId: string, page: DocumentPage, client: QueryClient) {
    const key = keyOf(userId, page.projectId, page.id);
    let session = sessions.get(key);
    if (!session) {
        session = new DocumentSession(page, {
            online: () => navigator.onLine,
            save: (input, signal) => saveDocument(page.projectId, page.id, input, signal),
            onSaved: (saved) => {
                client.setQueryData(documentKey(page.projectId, page.id), saved);
                client.setQueryData<DocumentSummary[]>(documentsKey(page.projectId), (old) =>
                    old?.map((item) => (item.id === saved.id ? { ...item, title: saved.title, iconAppearance: saved.iconAppearance, updatedAt: saved.updatedAt, revision: saved.revision } : item)),
                );
            },
        });
        sessions.set(key, session);
    }
    return session;
}
export async function pauseDocumentSession(userId: string, projectId: string, documentId: string) {
    const session = sessions.get(keyOf(userId, projectId, documentId));
    if (!session) return undefined;
    await session.pause();
    return () => session.resume();
}
/** Forgets the unsaved titles and the offline copies of pages kept in this browser, when someone signs out or a project is deleted. */
export async function clearDocumentDrafts(userId: string, projectId?: string) {
    const prefix = `${userId}:${projectId ? `${projectId}:` : ""}`;
    for (const [key, session] of sessions)
        if (key.startsWith(prefix)) {
            await session.pause();
            sessions.delete(key);
        }
    const local = localDatabasePrefix(userId, projectId);
    const listed = (await indexedDB.databases?.().catch(() => undefined)) ?? [];
    const names = [...new Set([...listed.map((database) => database.name ?? ""), ...rememberedLocalDatabases()])].filter((name) => name.startsWith(local));
    await Promise.all([...names, LEGACY_DRAFTS_DATABASE].map(deleteDatabase));
    forgetLocalDatabases(names);
}

/** Drafts from before pages were edited together. Nothing reads them anymore, but they hold page content. */
const LEGACY_DRAFTS_DATABASE = "rinia-document-drafts";

function deleteDatabase(name: string) {
    return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        // A tab with the page still open blocks the delete until it closes it; the request finishes then.
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
}
if (typeof window !== "undefined") {
    if (typeof indexedDB !== "undefined") void deleteDatabase(LEGACY_DRAFTS_DATABASE);
    window.addEventListener("online", () => sessions.forEach((session) => session.networkChanged()));
    window.addEventListener("offline", () => sessions.forEach((session) => session.networkChanged()));
    window.addEventListener("beforeunload", (event) => {
        if ([...sessions.values()].some((session) => session.getSnapshot().dirty)) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
}
