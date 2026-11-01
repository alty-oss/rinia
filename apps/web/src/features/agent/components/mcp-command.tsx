import { CopyOutline } from "@makeplane/propel/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslation } from "react-i18next";

/** Where tools reach Rinia's MCP server: the same origin as the app, which serves or proxies the API. */
export function mcpServerUrl() {
    return `${window.location.origin}/api/mcp`;
}

/** The command that adds Rinia to Claude Code. Without a token it shows a placeholder for one. */
export function claudeCodeCommand(token?: string) {
    return `claude mcp add --transport http rinia ${mcpServerUrl()} --header "Authorization: Bearer ${token ?? "rinia_..."}"`;
}

/** A value to paste somewhere else, such as a URL or a command, with a button that copies it. */
export function CopyField({ value, label, wrap = false }: { value: string; label: string; wrap?: boolean }) {
    const { t } = useTranslation();
    const { copied, copy } = useClipboard();
    return (
        <div className="flex w-full items-start gap-2">
            <code
                aria-label={label}
                className={`min-w-0 flex-1 rounded-lg border border-subtle bg-layer-2 px-3 py-2 font-mono text-[12px] leading-5 text-primary select-all ${wrap ? "break-all whitespace-pre-wrap" : "truncate"}`}
            >
                {value}
            </code>
            <ButtonUtility icon={CopyOutline} color="secondary" tooltip={copied ? t("agent.copied") : t("agent.copy")} onClick={() => void copy(value)} />
        </div>
    );
}
