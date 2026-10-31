import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFavorite, deleteFavorite, listFavorites, type Favorite, type FavoriteTarget } from "../api";

export const FAVORITES_QUERY_KEY = ["favorites"] as const;

export function useFavorites() {
    return useQuery({ queryKey: FAVORITES_QUERY_KEY, queryFn: listFavorites });
}

export function matchesTarget(favorite: Favorite, target: FavoriteTarget) {
    if (favorite.kind !== target.kind || favorite.projectId !== target.projectId) return false;
    if (target.kind === "document") return favorite.documentId === target.documentId;
    if (target.kind === "issue") return favorite.issueId === target.issueId;
    return true;
}

/** Star state for one target. The star flips immediately; the list refreshes once the server answers. */
export function useFavoriteToggle(target: FavoriteTarget | null) {
    const queryClient = useQueryClient();
    const { data: favorites } = useFavorites();
    const favorite = target ? favorites?.find((candidate) => matchesTarget(candidate, target)) : undefined;
    const mutation = useMutation({
        mutationFn: async (next: { add: true; target: FavoriteTarget } | { add: false; favoriteId: string }) => {
            if (next.add) await createFavorite(next.target);
            else await deleteFavorite(next.favoriteId);
        },
        onMutate: async (next) => {
            if (next.add) return;
            await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
            queryClient.setQueryData<Favorite[]>(FAVORITES_QUERY_KEY, (current) => current?.filter((item) => item.id !== next.favoriteId));
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
    });
    const pendingAdd = mutation.isPending && mutation.variables?.add === true;
    return {
        active: !!favorite || pendingAdd,
        isPending: mutation.isPending,
        toggle() {
            if (!target || mutation.isPending) return;
            if (favorite) mutation.mutate({ add: false, favoriteId: favorite.id });
            else mutation.mutate({ add: true, target });
        },
    };
}

export function useRemoveFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteFavorite,
        onMutate: async (favoriteId) => {
            await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
            queryClient.setQueryData<Favorite[]>(FAVORITES_QUERY_KEY, (current) => current?.filter((item) => item.id !== favoriteId));
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
    });
}

const LEGACY_FAVORITES_KEY = "rinia-favorites";

/** Favorites used to live only in this browser as a list of project ids; move them to the account once. */
export function useMigrateLegacyFavorites() {
    const queryClient = useQueryClient();
    useEffect(() => {
        let ids: unknown;
        try {
            ids = JSON.parse(localStorage.getItem(LEGACY_FAVORITES_KEY) ?? "null");
            localStorage.removeItem(LEGACY_FAVORITES_KEY);
        } catch {
            return;
        }
        if (!Array.isArray(ids) || ids.length === 0) return;
        const projectIds = ids.filter((id): id is string => typeof id === "string");
        void Promise.allSettled(projectIds.map((projectId) => createFavorite({ kind: "project", projectId }))).then(() =>
            queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
        );
    }, [queryClient]);
}
