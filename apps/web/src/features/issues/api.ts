import type { IssuePriority, IssueView } from "@rinia/shared";
import type {
    CreateIssueCommentInput,
    CreateIssueInput,
    CreateIssueRelationInput,
    IssueListQuery,
    TiptapDocument,
    UpdateIssueCommentInput,
    UpdateIssueInput,
    UpdateViewPreferenceInput,
} from "@rinia/shared";
import { apiClient } from "@/lib/api-client";

export interface IssuePerson {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
}

export interface Issue {
    id: string;
    projectId: string;
    number: number;
    identifier: string;
    columnId: string;
    title: string;
    descriptionJson: TiptapDocument;
    descriptionRevision: number;
    assigneeId: string | null;
    categoryId: string | null;
    priority: IssuePriority;
    createdBy: string;
    position: number;
    parentIssueId: string | null;
    estimate: number | null;
    createdAt: string;
    updatedAt: string;
}

export type IssueDetail = Omit<Issue, "createdBy"> & {
    project: { id: string; name: string; issueKey: string };
    assignee: IssuePerson | null;
    createdBy: IssuePerson;
    category: { id: string; name: string; color: string | null } | null;
    column: { id: string; name: string };
    parent: { id: string; number: number; title: string } | null;
    children: Array<{ id: string; number: number; title: string; columnId: string; priority: Issue["priority"] }>;
};

export interface IssueComment {
    id: string;
    issueId: string;
    authorId: string;
    contentJson: TiptapDocument;
    createdAt: string;
    updatedAt: string;
    author: IssuePerson;
}

export interface IssueActivity {
    id: string;
    issueId: string;
    actorId: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
    actor: IssuePerson;
}

export interface IssueRelation {
    id: string;
    sourceIssueId: string;
    targetIssueId: string;
    type: "blocks" | "blocked_by" | "related" | "duplicate";
    target: { id: string; number: number; title: string; projectId: string; project: { issueKey: string } };
}

function queryString(query: IssueListQuery) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => value !== undefined && params.set(key, String(value)));
    return params.toString() ? `?${params.toString()}` : "";
}

export function listIssues(projectId: string, query: IssueListQuery = { orderBy: "position" }): Promise<Issue[]> {
    return apiClient.get<{ issues: Issue[] }>(`/projects/${projectId}/issues${queryString(query)}`).then((res) => res.issues);
}

export function createIssue(projectId: string, input: CreateIssueInput): Promise<Issue> {
    return apiClient.post<{ issue: Issue }>(`/projects/${projectId}/issues`, input).then((res) => res.issue);
}

export function getIssue(identifier: string): Promise<IssueDetail> {
    return apiClient.get<{ issue: IssueDetail }>(`/issues/${encodeURIComponent(identifier)}`).then((res) => res.issue);
}

export function updateIssue(identifier: string, input: UpdateIssueInput): Promise<Issue> {
    return apiClient.patch<{ issue: Issue }>(`/issues/${encodeURIComponent(identifier)}`, input).then((res) => res.issue);
}

export function deleteIssue(identifier: string): Promise<void> {
    return apiClient.delete<void>(`/issues/${encodeURIComponent(identifier)}`);
}

export function listIssueComments(identifier: string): Promise<IssueComment[]> {
    return apiClient.get<{ comments: IssueComment[] }>(`/issues/${encodeURIComponent(identifier)}/comments`).then((res) => res.comments);
}

export function createIssueComment(identifier: string, input: CreateIssueCommentInput): Promise<IssueComment> {
    return apiClient.post<{ comment: IssueComment }>(`/issues/${encodeURIComponent(identifier)}/comments`, input).then((res) => res.comment);
}

export function updateIssueComment(commentId: string, input: UpdateIssueCommentInput): Promise<IssueComment> {
    return apiClient.patch<{ comment: IssueComment }>(`/comments/${commentId}`, input).then((res) => res.comment);
}

export function deleteIssueComment(commentId: string): Promise<void> {
    return apiClient.delete<void>(`/comments/${commentId}`);
}

export function listIssueActivity(identifier: string): Promise<IssueActivity[]> {
    return apiClient.get<{ activity: IssueActivity[] }>(`/issues/${encodeURIComponent(identifier)}/activity`).then((res) => res.activity);
}

export function listIssueRelations(identifier: string): Promise<IssueRelation[]> {
    return apiClient.get<{ relations: IssueRelation[] }>(`/issues/${encodeURIComponent(identifier)}/relations`).then((res) => res.relations);
}

export function createIssueRelation(identifier: string, input: CreateIssueRelationInput): Promise<IssueRelation> {
    return apiClient.post<{ relation: IssueRelation }>(`/issues/${encodeURIComponent(identifier)}/relations`, input).then((res) => res.relation);
}

export function deleteIssueRelation(relationId: string): Promise<void> {
    return apiClient.delete<void>(`/relations/${relationId}`);
}

export interface ViewPreference {
    issueView: IssueView;
}

export function getViewPreference(projectId: string): Promise<ViewPreference> {
    return apiClient.get<{ preference: ViewPreference }>(`/projects/${projectId}/view-preference`).then((res) => res.preference);
}

export function updateViewPreference(projectId: string, input: UpdateViewPreferenceInput): Promise<ViewPreference> {
    return apiClient.patch<{ preference: ViewPreference }>(`/projects/${projectId}/view-preference`, input).then((res) => res.preference);
}
