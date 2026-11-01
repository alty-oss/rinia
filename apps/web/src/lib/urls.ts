/**
 * Every in-app URL is built here. Projects are addressed by their issue key (`/project/RIN`) and issues by
 * their identifier (`/issue/RIN-4/short-title`), never by database ids. Trailing slugs are cosmetic.
 */

import type { MyIssuesFilter } from "@rinia/shared";

export type IssueScope = "active" | "backlog" | "all";
export type ProjectSettingsSection = "general" | "members" | "states" | "labels";

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

/** The project key inside an issue identifier: `RIN-4` → `RIN`. */
export function projectKeyOf(identifier: string) {
    return identifier.slice(0, identifier.lastIndexOf("-")).toUpperCase();
}

export const urls = {
    projects: () => "/",
    inbox: () => "/inbox",
    myIssues: (filter: MyIssuesFilter = "assigned") => (filter === "assigned" ? "/my-issues" : `/my-issues/${filter}`),
    project: (key: string) => `/project/${key}`,
    issues: (key: string, scope: IssueScope = "active") => (scope === "active" ? `/project/${key}/issues` : `/project/${key}/issues/${scope}`),
    issue: (identifier: string, title?: string) => {
        const slug = title ? slugify(title) : "";
        return slug ? `/issue/${identifier}/${slug}` : `/issue/${identifier}`;
    },
    documents: (key: string) => `/project/${key}/docs`,
    document: (key: string, document: { id: string; title: string }) => `/project/${key}/docs/${documentSlug(document)}`,
    views: (key: string) => `/project/${key}/views`,
    /** Saved views are addressed like documents: the name for people, the first digits of the id for lookups. */
    view: (key: string, view: { id: string; name: string }) => `/project/${key}/views/${documentSlug({ id: view.id, title: view.name })}`,
    members: (key: string) => `/project/${key}/members`,
    projectSettings: (key: string, section?: ProjectSettingsSection) => (section ? `/settings/project/${key}/${section}` : `/settings/project/${key}`),
};
