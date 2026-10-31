import type { Locale } from "@rinia/shared";

/**
 * The workflow every new project starts with, as in Linear: a backlog, work to do, in progress and in review,
 * then the two ways an issue closes. Names follow the creator's locale; the web app translates the known ones.
 */
export const DEFAULT_COLUMNS: Record<Locale, Array<{ name: string; color: string }>> = {
    en: [
        { name: "Backlog", color: "#8a8f98" },
        { name: "To Do", color: "#eaaa08" },
        { name: "In Progress", color: "#7a5af8" },
        { name: "In Review", color: "#0ba5ec" },
        { name: "Done", color: "#17b26a" },
        { name: "Canceled", color: "#8a8f98" },
    ],
    "pt-BR": [
        { name: "Fila", color: "#8a8f98" },
        { name: "A fazer", color: "#eaaa08" },
        { name: "Em andamento", color: "#7a5af8" },
        { name: "Em revisão", color: "#0ba5ec" },
        { name: "Concluído", color: "#17b26a" },
        { name: "Cancelado", color: "#8a8f98" },
    ],
};

/** The three columns projects were created with before the workflow above. */
export const LEGACY_DEFAULT_COLUMNS: Record<Locale, readonly string[]> = {
    en: ["To Do", "In Progress", "Done"],
    "pt-BR": ["A fazer", "Em andamento", "Concluído"],
};
