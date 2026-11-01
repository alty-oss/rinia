import type { CreateViewInput, UpdateViewInput } from "@rinia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/feedback/toaster";
import { FAVORITES_QUERY_KEY } from "@/features/favorites/hooks/use-favorites";
import { createView, deleteView, duplicateView, listViews, restoreView, updateView } from "../api";

export const viewsKey = (projectId: string) => ["projects", projectId, "views"] as const;

export const useViews = (projectId: string) => useQuery({ queryKey: viewsKey(projectId), queryFn: () => listViews(projectId), enabled: !!projectId });

/** Changing a view can also change what the favorites list shows, so both refresh together. */
function useRefreshViews(projectId: string) {
    const queryClient = useQueryClient();
    return () =>
        Promise.all([queryClient.invalidateQueries({ queryKey: viewsKey(projectId) }), queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY })]);
}

export function useCreateView(projectId: string) {
    const refresh = useRefreshViews(projectId);
    return useMutation({ mutationFn: (input: CreateViewInput) => createView(projectId, input), onSuccess: refresh });
}

export function useUpdateView(projectId: string) {
    const refresh = useRefreshViews(projectId);
    return useMutation({
        mutationFn: ({ viewId, input }: { viewId: string; input: UpdateViewInput }) => updateView(projectId, viewId, input),
        onSuccess: refresh,
    });
}

export function useDuplicateView(projectId: string) {
    const refresh = useRefreshViews(projectId);
    return useMutation({ mutationFn: ({ viewId, name }: { viewId: string; name?: string }) => duplicateView(projectId, viewId, { name }), onSuccess: refresh });
}

/**
 * Deleting offers an undo, like the other deletes. `onDeleted` runs first, while the page can still leave the
 * view (the view's controls unmount as soon as the list refreshes); `onRestored` runs once the view is back.
 */
export function useDeleteView(projectId: string) {
    const refresh = useRefreshViews(projectId);
    const showToast = useToast();
    const { t } = useTranslation();
    return useMutation({
        mutationFn: ({ viewId }: { viewId: string; name: string; onDeleted?: () => void; onRestored?: () => void }) => deleteView(projectId, viewId),
        onSuccess: async ({ deletedAt }, { viewId, name, onDeleted, onRestored }) => {
            onDeleted?.();
            await refresh();
            showToast({
                title: t("views.deleted", { name }),
                action: {
                    label: t("issue.undo"),
                    onClick: async () => {
                        try {
                            await restoreView(projectId, viewId, deletedAt);
                            await refresh();
                            onRestored?.();
                        } catch {
                            showToast({ tone: "error", title: t("issue.couldNotUndo") });
                        }
                    },
                },
            });
        },
    });
}
