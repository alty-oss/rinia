/**
 * The slugs in in-app URLs, shared by the web app and the API (which links to pages from outside the app, such as
 * MCP results). Projects are addressed by their issue key and issues by their identifier, never by database ids.
 */

export function slugify(text: string, maxLength = 60) {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, maxLength)
        .replace(/-+$/g, "");
}

const DOCUMENT_ID_LENGTH = 12;

/** `roadmap-3f2a9c1b7d4e`: the title for people, the first 12 hex digits of the id for lookups. */
export function documentSlug(document: { id: string; title: string }) {
    const shortId = document.id.replace(/-/g, "").slice(0, DOCUMENT_ID_LENGTH);
    const title = slugify(document.title, 48);
    return title ? `${title}-${shortId}` : shortId;
}

/** Finds the document a slug points at. Accepts a bare short id or a full UUID too. */
export function matchDocumentSlug<T extends { id: string }>(slug: string, documents: T[] | undefined): T | undefined {
    if (!documents) return undefined;
    const exact = documents.find((document) => document.id === slug);
    if (exact) return exact;
    const shortId = slug.slice(slug.lastIndexOf("-") + 1).toLowerCase();
    if (shortId.length < DOCUMENT_ID_LENGTH) return undefined;
    return documents.find((document) => document.id.replace(/-/g, "").startsWith(shortId));
}

export const appPaths = {
    project: (key: string) => `/project/${key}`,
    issue: (identifier: string, title?: string) => {
        const slug = title ? slugify(title) : "";
        return slug ? `/issue/${identifier}/${slug}` : `/issue/${identifier}`;
    },
    document: (key: string, document: { id: string; title: string }) => `/project/${key}/docs/${documentSlug(document)}`,
};
