export const THEME_STORAGE_KEY = "rinia-theme";

export const themePreferences = ["system", "light", "dark", "light-contrast", "dark-contrast"] as const;

export type ThemePreference = (typeof themePreferences)[number];

export type ResolvedTheme = Exclude<ThemePreference, "system">;

const themePreferenceSet = new Set<string>(themePreferences);

export function isThemePreference(value: string | null): value is ThemePreference {
    return value !== null && themePreferenceSet.has(value);
}

export function readThemePreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemePreference(stored)) return stored;
    } catch {
        // Storage can be blocked; the default keeps the current dark interface.
    }
    return "dark";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
    if (preference !== "system") return preference;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
    const resolved = resolveTheme(preference);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved.includes("dark") ? "dark" : "light";
    root.classList.toggle("dark-mode", resolved.includes("dark"));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.includes("dark") ? "#0f1011" : "#f4f4f5");
}
