import type { CreateFavoriteInput, EntityIcon, FavoriteKind } from "@rinia/shared";
import { apiClient } from "@/lib/api-client";

export interface Favorite {
    id: string;
    kind: FavoriteKind;
    projectId: string;
    documentId: string | null;
    issueId: string | null;
    createdAt: string;
    project: { id: string; name: string; issueKey: string; icon: string | null; iconAppearance: EntityIcon | null };
    document: { id: string; title: string; iconAppearance: EntityIcon | null } | null;
    issue: { id: string; number: number; title: string; identifier: string } | null;
}

export type FavoriteTarget = CreateFavoriteInput;

export function listFavorites(): Promise<Favorite[]> {
    return apiClient.get<{ favorites: Favorite[] }>("/favorites").then((res) => res.favorites);
}

export function createFavorite(target: FavoriteTarget): Promise<Favorite> {
    return apiClient.post<{ favorite: Favorite }>("/favorites", target).then((res) => res.favorite);
}

export function deleteFavorite(favoriteId: string): Promise<void> {
    return apiClient.delete<void>(`/favorites/${favoriteId}`);
}
