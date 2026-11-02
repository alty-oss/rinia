import { language as bash } from "@twinkleplop/bash";
import { language as json } from "@twinkleplop/json";
import { language as toml } from "@twinkleplop/toml";
import "@twinkleplop/theme-github";

export type SnippetLanguage = "bash" | "json" | "toml" | "text";

const highlighters = { bash: bash(), json: json(), toml: toml() };

/**
 * Shell source with the pieces the bash grammar splits apart (`--` + word, `http` + `:` + `//`...) marked whole as
 * overlays: the command, each flag, each URL and each line continuation. `copy-field.css` colours each as one piece.
 */
function shell(source: string) {
    const overlays: Array<{ start: number; end: number; class: string }> = [];
    const mark = (pattern: RegExp, name: string) => {
        for (const match of source.matchAll(pattern)) overlays.push({ start: match.index, end: match.index + match[0].length, class: name });
    };
    mark(/^(?!https?:)(?!export\b)[^\s]+/g, "command");
    mark(/(?<=\s)--[\w-]+/g, "flag");
    mark(/https?:\/\/[^\s"]+/g, "url");
    mark(/\\(?=\n)/g, "continuation");
    return highlighters.bash(source, { structure: "inline", overlays });
}

/** JSON with object keys told apart from string values, which the grammar colours alike. */
function jsonWithKeys(source: string) {
    return highlighters.json(source, {
        structure: "inline",
        token: (type, _start, end) => (type === "string" && /^\s*:/.test(source.slice(end)) ? { class: "key" } : undefined),
    });
}

/** Highlighted HTML for a snippet, or null for plain text. twinkleplop escapes the source. */
export function highlight(source: string, language: SnippetLanguage): string | null {
    if (language === "bash") return shell(source);
    if (language === "json") return jsonWithKeys(source);
    if (language === "toml") return highlighters.toml(source, { structure: "inline" });
    return null;
}
