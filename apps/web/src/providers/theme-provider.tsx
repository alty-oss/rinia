import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyTheme, readThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "./theme";

interface ThemeContextValue {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

    useEffect(() => {
        applyTheme(preference);
    }, [preference]);

    const setPreference = (next: ThemePreference) => {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        setPreferenceState(next);
    };

    return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
