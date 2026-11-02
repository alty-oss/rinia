export const THEME_STORAGE_KEY = "rinia-theme";

export const themePreferences = ["light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export type ResolvedTheme = ThemePreference;

const themePreferenceSet = new Set<string>(themePreferences);

export function isThemePreference(value: string | null): value is ThemePreference {
    return value !== null && themePreferenceSet.has(value);
}

/** Older builds also offered "system" and high-contrast themes; those map to their light or dark base. */
export function readThemePreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemePreference(stored)) return stored;
        if (stored === "light-contrast") return "light";
        if (stored === "dark-contrast") return "dark";
        if (stored === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
        // Storage can be blocked; the default keeps the current dark interface.
    }
    return "dark";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
    return preference;
}

export function applyTheme(preference: ThemePreference) {
    const resolved = resolveTheme(preference);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved.includes("dark") ? "dark" : "light";
    root.classList.toggle("dark-mode", resolved.includes("dark"));
    // Code highlighted by twinkleplop switches its theme on `.dark`.
    root.classList.toggle("dark", resolved.includes("dark"));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.includes("dark") ? "#090909" : "#f4f4f5");
}
