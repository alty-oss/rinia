import { type SavedViewFilters, savedViewFilterKeys, savedViewFiltersSchema } from "@rinia/shared";

/** What a parameter reads as when the URL leaves it out. Saved views leave these out too. */
const DEFAULTS: Partial<Record<keyof SavedViewFilters, string>> = { group: "status", order: "position", scope: "active" };

/**
 * The issue page's URL parameters as a saved view keeps them. Values the page would ignore, empty ones, and
 * defaults are dropped, so two screens that look the same always produce the same filters.
 */
export function filtersFromParams(params: URLSearchParams): SavedViewFilters {
    const filters: Record<string, string> = {};
    for (const key of savedViewFilterKeys) {
        const value = params.get(key);
        if (!value || value === DEFAULTS[key]) continue;
        if (savedViewFiltersSchema.shape[key].safeParse(value).success) filters[key] = value;
    }
    return filters as SavedViewFilters;
}

/** The URL query that opens the issue page the way a view was saved. */
export function paramsFromFilters(filters: SavedViewFilters): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of savedViewFilterKeys) {
        const value = filters[key];
        if (value) params.set(key, value);
    }
    return params;
}

export function sameFilters(left: SavedViewFilters, right: SavedViewFilters) {
    return savedViewFilterKeys.every((key) => (left[key] ?? "") === (right[key] ?? ""));
}

/** Search, filters, or a due date narrow the list; grouping and ordering alone do not. */
export function hasActiveFilters(filters: SavedViewFilters) {
    return !!(filters.q || filters.priority || filters.status || filters.assignee || filters.label || filters.due);
}
