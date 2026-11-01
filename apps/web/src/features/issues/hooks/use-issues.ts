import { nextLabels, positionsAtTop } from "@rinia/shared";
import type {
    BulkIssuePatch,
    CreateIssueCommentInput,
    CreateIssueInput,
    CreateIssueRelationInput,
    IssueListQuery,
    MyIssuesQuery,
    UpdateIssueCommentInput,
    UpdateIssueInput,
} from "@rinia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Issue, IssueComment, IssueDetail, IssuePerson, MyIssue } from "../api";
import {
    addCommentReaction,
    bulkDeleteIssues,
    bulkUpdateIssues,
    createIssue,
    createIssueComment,
    createIssueRelation,
    deleteIssue,
    deleteIssueComment,
    deleteIssueRelation,
    getIssue,
    listDescriptionRevisions,
    listIssueActivity,
    listIssueComments,
    listIssueRelations,
    listIssues,
    listMyIssues,
    removeCommentReaction,
    restoreDescriptionRevision,
    updateIssue,
    updateIssueComment,
} from "../api";

export const issuesKey = (projectId: string, query: IssueListQuery = { orderBy: "position" }) => ["projects", projectId, "issues", query] as const;
export const issueKey = (identifier: string) => ["issues", identifier] as const;
type IssueUpdateField = Exclude<keyof UpdateIssueInput, "expectedDescriptionRevision">;

export function useIssues(projectId: string, query: IssueListQuery = { orderBy: "position" }) {
    return useQuery({ queryKey: issuesKey(projectId, query), queryFn: () => listIssues(projectId, query), enabled: !!projectId });
}

export const MY_ISSUES_QUERY_KEY = ["my-issues"] as const;

export function useMyIssues(query: MyIssuesQuery) {
    return useQuery({ queryKey: [...MY_ISSUES_QUERY_KEY, query], queryFn: () => listMyIssues(query) });
}

/** Edits an issue from "My issues": the row changes at once, then the issue's own project lists refresh too. */
export function useUpdateMyIssue() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ issue, input }: { issue: MyIssue; input: UpdateIssueInput }) => updateIssue(issue.identifier, input),
        onMutate: async ({ issue, input }) => {
            await queryClient.cancelQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            const previous = queryClient.getQueriesData<MyIssue[]>({ queryKey: MY_ISSUES_QUERY_KEY });
            queryClient.setQueriesData<MyIssue[]>({ queryKey: MY_ISSUES_QUERY_KEY }, (current) => current?.map((item) => (item.id === issue.id ? { ...item, ...input } : item)));
            return { previous };
        },
        onError: (_error, _variables, context) => context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data)),
        onSettled: (_data, _error, { issue }) => {
            queryClient.invalidateQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ["projects", issue.projectId, "issues"] });
            queryClient.invalidateQueries({ queryKey: issueKey(issue.identifier) });
        },
    });
}

export function useIssue(identifier: string | null) {
    return useQuery({ queryKey: issueKey(identifier ?? ""), queryFn: () => getIssue(identifier!), enabled: !!identifier });
}

export function useCreateIssue(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateIssueInput) => createIssue(projectId, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId, "issues"] }),
    });
}

export function useUpdateIssue(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        // Edits to a project's issues are sent one after another, so a slower request never lands after a newer one.
        scope: { id: `issues:${projectId}` },
        mutationFn: ({ identifier, input }: { identifier: string; input: UpdateIssueInput }) => updateIssue(identifier, input),
        onMutate: async ({ identifier, input }) => {
            const { expectedDescriptionRevision: _expectedDescriptionRevision, ...inputValues } = input;
            const optimisticValues: Partial<Pick<Issue, IssueUpdateField>> = inputValues;
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["projects", projectId, "issues"] }),
                queryClient.cancelQueries({ queryKey: issueKey(identifier) }),
            ]);
            const previous = queryClient.getQueriesData<Issue[]>({ queryKey: ["projects", projectId, "issues"] });
            const previousDetail = queryClient.getQueryData<IssueDetail>(issueKey(identifier));

            // Moved to another column without a place picked, the card goes to the top, as the server puts it.
            const placesAtTop = !!input.columnId && input.position === undefined;
            for (const [queryKey] of previous) {
                queryClient.setQueryData<Issue[]>(queryKey, (current) => {
                    const placed = placesAtTop && current ? placeMovedAtTop(current, (issue) => issue.identifier === identifier, input.columnId!) : current;
                    return placed?.map((issue) => (issue.identifier === identifier ? { ...issue, ...optimisticValues } : issue));
                });
            }
            queryClient.setQueryData<IssueDetail>(issueKey(identifier), (current) => current ? { ...current, ...optimisticValues } : current);

            return { previous, previousDetail, optimisticValues, placesAtTop };
        },
        onError: (_error, variables, context) => {
            if (!context) return;
            const fields = Object.keys(context.optimisticValues) as IssueUpdateField[];
            context.previous.forEach(([queryKey, previousIssues]) => {
                queryClient.setQueryData<Issue[]>(queryKey, (current) => {
                    if (!current || !previousIssues) return current;
                    return current.map((issue) => {
                        if (issue.identifier !== variables.identifier) return issue;
                        const previousIssue = previousIssues.find((entry) => entry.identifier === variables.identifier);
                        if (!previousIssue) return issue;
                        const rollback: Partial<Pick<Issue, IssueUpdateField>> = {};
                        for (const field of fields) {
                            if (Object.is(issue[field], context.optimisticValues[field])) {
                                (rollback as Record<string, unknown>)[field] = previousIssue[field as keyof Issue];
                            }
                        }
                        // The position was not part of the request, so it is not among the fields above.
                        if (context.placesAtTop) rollback.position = previousIssue.position;
                        return { ...issue, ...rollback };
                    });
                });
            });
            if (context.previousDetail) {
                queryClient.setQueryData<IssueDetail>(issueKey(variables.identifier), (current) => {
                    if (!current) return current;
                    const rollback: Partial<Pick<IssueDetail, IssueUpdateField>> = {};
                    for (const field of fields) {
                        if (Object.is(current[field], context.optimisticValues[field])) {
                            (rollback as Record<string, unknown>)[field] = context.previousDetail?.[field];
                        }
                    }
                    return { ...current, ...rollback };
                });
            }
        },
        onSuccess: (issue) => {
            const { createdBy: _createdBy, ...updatedFields } = issue;
            queryClient.setQueryData<IssueDetail>(issueKey(issue.identifier), (current) => current ? { ...current, ...updatedFields } : current);
            queryClient.invalidateQueries({ queryKey: ["projects", projectId, "issues"] });
            queryClient.invalidateQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: issueKey(issue.identifier) });
        },
        // Invalidating the issue also refreshes whether you follow it, which assigning or mentioning can change.
        onSettled: (_data, _error, variables) => queryClient.invalidateQueries({ queryKey: issueKey(variables.identifier) }),
    });
}

export function useDeleteIssue(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteIssue,
        onSuccess: async (_result, identifier) => {
            queryClient.removeQueries({ queryKey: issueKey(identifier), exact: true });
            await queryClient.invalidateQueries({ queryKey: ["projects", projectId, "issues"] });
            await queryClient.invalidateQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: ["favorites"] });
            await queryClient.invalidateQueries({ queryKey: ["issues"] });
        },
    });
}

export function useIssueComments(identifier: string | null) {
    return useQuery({ queryKey: [...issueKey(identifier ?? ""), "comments"], queryFn: () => listIssueComments(identifier!), enabled: !!identifier });
}

export function useIssueActivity(identifier: string | null) {
    return useQuery({ queryKey: [...issueKey(identifier ?? ""), "activity"], queryFn: () => listIssueActivity(identifier!), enabled: !!identifier });
}

export function useIssueRelations(identifier: string | null) {
    return useQuery({ queryKey: [...issueKey(identifier ?? ""), "relations"], queryFn: () => listIssueRelations(identifier!), enabled: !!identifier });
}

export function useCreateIssueComment(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateIssueCommentInput) => createIssueComment(identifier, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "comments"] });
            // Commenting makes you follow the issue.
            queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "subscription"] });
        },
    });
}

export function useUpdateIssueComment(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ commentId, input }: { commentId: string; input: UpdateIssueCommentInput }) => updateIssueComment(commentId, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "comments"] }),
    });
}

export function useDeleteIssueComment(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: deleteIssueComment, onSuccess: () => queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "comments"] }) });
}

export function useCreateIssueRelation(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateIssueRelationInput) => createIssueRelation(identifier, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "relations"] }),
    });
}

export function useDeleteIssueRelation(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteIssueRelation,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [...issueKey(identifier), "relations"] }),
    });
}

/**
 * Adds or removes your reaction. The chip changes at once, then takes the server's list of reactions, which also
 * brings in anyone else's that arrived meanwhile.
 */
export function useToggleReaction(identifier: string, me: IssuePerson | null) {
    const queryClient = useQueryClient();
    const commentsKey = [...issueKey(identifier), "comments"];
    const setReactions = (commentId: string, update: (reactions: IssueComment["reactions"]) => IssueComment["reactions"]) =>
        queryClient.setQueryData<IssueComment[]>(commentsKey, (current) => current?.map((comment) => (comment.id === commentId ? { ...comment, reactions: update(comment.reactions) } : comment)));
    return useMutation({
        mutationFn: ({ commentId, emoji, add }: { commentId: string; emoji: string; add: boolean }) => (add ? addCommentReaction(commentId, emoji) : removeCommentReaction(commentId, emoji)),
        onMutate: async ({ commentId, emoji, add }) => {
            await queryClient.cancelQueries({ queryKey: commentsKey });
            const previous = queryClient.getQueryData<IssueComment[]>(commentsKey);
            if (me) {
                setReactions(commentId, (reactions) => {
                    if (!add) return reactions.map((group) => (group.emoji === emoji ? { ...group, users: group.users.filter((user) => user.id !== me.id) } : group)).filter((group) => group.users.length > 0);
                    if (reactions.some((group) => group.emoji === emoji)) return reactions.map((group) => (group.emoji === emoji && !group.users.some((user) => user.id === me.id) ? { ...group, users: [...group.users, me] } : group));
                    return [...reactions, { emoji, users: [me] }];
                });
            }
            return { previous };
        },
        onError: (_error, _variables, context) => queryClient.setQueryData(commentsKey, context?.previous),
        onSuccess: (reactions, { commentId }) => setReactions(commentId, () => reactions),
    });
}

export function useDescriptionRevisions(identifier: string, enabled: boolean) {
    return useQuery({ queryKey: [...issueKey(identifier), "description-revisions"], queryFn: () => listDescriptionRevisions(identifier), enabled: enabled && !!identifier });
}

export function useRestoreDescriptionRevision(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (revisionId: string) => restoreDescriptionRevision(identifier, revisionId),
        onSuccess: (issue) => {
            queryClient.invalidateQueries({ queryKey: issueKey(identifier) });
            queryClient.invalidateQueries({ queryKey: ["projects", issue.projectId, "issues"] });
        },
    });
}

/** An issue as a bulk change leaves it, for showing the change before the server confirms it. */
export function applyBulkPatch<T extends Issue>(issue: T, patch: BulkIssuePatch): T {
    const { categoryIds, addCategoryIds, removeCategoryIds, ...values } = patch;
    const touchesLabels = categoryIds !== undefined || addCategoryIds !== undefined || removeCategoryIds !== undefined;
    return { ...issue, ...values, ...(touchesLabels ? { categoryIds: nextLabels(issue.categoryIds, patch) } : {}) };
}

/**
 * Gives the selected cards that are moving to `columnId` the positions the server will give them: above the column's
 * top card, in the order they had. The board sorts by position, so they show at the top before the response arrives.
 */
function placeMovedAtTop<T extends Issue>(list: T[], selected: (issue: T) => boolean, columnId: string): T[] {
    const moving = list.filter((issue) => selected(issue) && issue.columnId !== columnId).sort((a, b) => a.position - b.position || a.number - b.number);
    if (!moving.length) return list;
    const staying = list.filter((issue) => issue.columnId === columnId && !moving.includes(issue));
    const top = staying.length ? Math.min(...staying.map((issue) => issue.position)) : null;
    const positions = new Map(positionsAtTop(top, moving.length).map((position, index) => [moving[index].id, position]));
    return list.map((issue) => (positions.has(issue.id) ? { ...issue, position: positions.get(issue.id)! } : issue));
}

/** Changes many issues in one request. Every cached list shows the change at once and rolls back if it fails. */
export function useBulkUpdateIssues(projectId: string) {
    const queryClient = useQueryClient();
    const lists = ["projects", projectId, "issues"];
    return useMutation({
        // Shares the queue of single edits (see `useUpdateIssue`), so bulk and single changes land in the order made.
        scope: { id: `issues:${projectId}` },
        mutationFn: ({ issueIds, patch }: { issueIds: string[]; patch: BulkIssuePatch }) => bulkUpdateIssues(projectId, issueIds, patch),
        onMutate: async ({ issueIds, patch }) => {
            await queryClient.cancelQueries({ queryKey: lists });
            const previous = queryClient.getQueriesData<Issue[]>({ queryKey: lists });
            const ids = new Set(issueIds);
            queryClient.setQueriesData<Issue[]>({ queryKey: lists }, (current) => {
                const placed = patch.columnId && current ? placeMovedAtTop(current, (issue) => ids.has(issue.id), patch.columnId) : current;
                return placed?.map((issue) => (ids.has(issue.id) ? applyBulkPatch(issue, patch) : issue));
            });
            return { previous };
        },
        onError: (_error, _variables, context) => context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data)),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: lists });
            queryClient.invalidateQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ["favorites"] });
            queryClient.invalidateQueries({ queryKey: ["issues"] });
        },
    });
}

/** Deletes many issues in one request. They leave every cached list at once and come back if it fails. */
export function useBulkDeleteIssues(projectId: string) {
    const queryClient = useQueryClient();
    const lists = ["projects", projectId, "issues"];
    return useMutation({
        mutationFn: (issueIds: string[]) => bulkDeleteIssues(projectId, issueIds),
        onMutate: async (issueIds) => {
            await queryClient.cancelQueries({ queryKey: lists });
            const previous = queryClient.getQueriesData<Issue[]>({ queryKey: lists });
            const ids = new Set(issueIds);
            queryClient.setQueriesData<Issue[]>({ queryKey: lists }, (current) => current?.filter((issue) => !ids.has(issue.id)));
            return { previous };
        },
        onError: (_error, _variables, context) => context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data)),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: lists });
            queryClient.invalidateQueries({ queryKey: MY_ISSUES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ["favorites"] });
            queryClient.invalidateQueries({ queryKey: ["issues"] });
        },
    });
}
