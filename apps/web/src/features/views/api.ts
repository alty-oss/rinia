import type { CreateViewInput, DuplicateViewInput, SavedViewFilters, UpdateViewInput } from "@rinia/shared";
import { apiClient } from "@/lib/api-client";

export interface SavedView {
    id: string;
    projectId: string;
    ownerId: string;
    owner: { id: string; name: string };
    name: string;
    shared: boolean;
    filters: SavedViewFilters;
    /** Whether the signed-in user may rename, change, or delete it. */
    canEdit: boolean;
    createdAt: string;
    updatedAt: string;
}

const base = (projectId: string) => `/projects/${projectId}/views`;

export const listViews = (projectId: string) => apiClient.get<{ views: SavedView[] }>(base(projectId)).then((res) => res.views);
export const createView = (projectId: string, input: CreateViewInput) => apiClient.post<{ view: SavedView }>(base(projectId), input).then((res) => res.view);
export const updateView = (projectId: string, viewId: string, input: UpdateViewInput) =>
    apiClient.patch<{ view: SavedView }>(`${base(projectId)}/${viewId}`, input).then((res) => res.view);
export const duplicateView = (projectId: string, viewId: string, input: DuplicateViewInput = {}) =>
    apiClient.post<{ view: SavedView }>(`${base(projectId)}/${viewId}/duplicate`, input).then((res) => res.view);
export const deleteView = (projectId: string, viewId: string) => apiClient.delete<{ deletedAt: string }>(`${base(projectId)}/${viewId}`);
export const restoreView = (projectId: string, viewId: string, deletedAt: string) =>
    apiClient.post<void>(`${base(projectId)}/${viewId}/restore`, { deletedAt });
