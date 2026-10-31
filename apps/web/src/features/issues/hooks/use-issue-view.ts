import { defaultIssueView, type IssueView } from "@rinia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { getViewPreference, updateViewPreference, type ViewPreference } from "../api";
import { readIssueView } from "../views";

export const viewPreferenceKey = (projectId: string) => ["projects", projectId, "view-preference"] as const;

// The server keeps the preference; this copy only lets a reload on the same device open the right view at once.
const storageKey = (projectId: string) => `rinia-issue-view:${projectId}`;

function readStoredPreference(projectId: string): ViewPreference | undefined {
    try {
        const issueView = readIssueView(localStorage.getItem(storageKey(projectId)));
        return issueView ? { issueView } : undefined;
    } catch {
        return undefined;
    }
}

function storePreference(projectId: string, preference: ViewPreference) {
    try {
        localStorage.setItem(storageKey(projectId), preference.issueView);
    } catch {
        // The server copy still applies on the next load.
    }
}

/**
 * The issue view for a project. A `?view=` link wins, then the view this user last chose for the project.
 * `view` is null only while a first-time preference is still loading. Choosing a view saves it.
 */
export function useIssueView(projectId: string) {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryKey = viewPreferenceKey(projectId);
    const preference = useQuery({
        queryKey,
        queryFn: async () => {
            const saved = await getViewPreference(projectId);
            storePreference(projectId, saved);
            return saved;
        },
        initialData: () => readStoredPreference(projectId),
        initialDataUpdatedAt: 0,
        staleTime: Infinity,
    });
    const save = useMutation({
        mutationFn: (issueView: IssueView) => updateViewPreference(projectId, { issueView }),
        onMutate: async (issueView) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ViewPreference>(queryKey);
            queryClient.setQueryData<ViewPreference>(queryKey, { issueView });
            storePreference(projectId, { issueView });
            return { previous };
        },
        onError: (_error, _issueView, context) => {
            if (!context?.previous) return;
            queryClient.setQueryData(queryKey, context.previous);
            storePreference(projectId, context.previous);
        },
    });

    const linked = readIssueView(searchParams.get("view"));
    const view = linked ?? preference.data?.issueView ?? (preference.isError ? defaultIssueView : null);

    function setView(next: IssueView) {
        // Once the user picks a view, the saved preference drives the page, so drop the link's override.
        if (linked) {
            setSearchParams((current) => {
                current.delete("view");
                return current;
            }, { replace: true });
        }
        if (next !== preference.data?.issueView) save.mutate(next);
    }

    return { view, setView };
}
