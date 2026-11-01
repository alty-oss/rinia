import { Link } from "react-router";
import { SettingsControl, SettingsGroup, SettingsPage } from "@/components/settings/settings-layout";
import { claudeCodeCommand, CopyField, mcpServerUrl } from "@/features/agent/components/mcp-command";
import { urls } from "@/lib/urls";
import { useTranslation } from "react-i18next";

/** The MCP server's tools, as `mcp.server.ts` registers them. */
const READ_TOOLS = [
    ["list_projects", "agent.toolListProjects"],
    ["list_issues", "agent.toolListIssues"],
    ["get_issue", "agent.toolGetIssue"],
    ["search", "agent.toolSearch"],
    ["get_document", "agent.toolGetDocument"],
] as const;
const WRITE_TOOLS = [
    ["create_issue", "agent.toolCreateIssue"],
    ["update_issue", "agent.toolUpdateIssue"],
    ["add_comment", "agent.toolAddComment"],
    ["create_document", "agent.toolCreateDocument"],
] as const;

/** How to connect an AI tool to Rinia, and what it can do once connected. */
export function AgentMcpSettingsPage() {
    const { t } = useTranslation();
    return (
        <SettingsPage title={t("nav.mcp")} description={t("agent.mcpDescription")}>
            <SettingsGroup title={t("agent.connect")} description={t("agent.connectDescription")}>
                <SettingsControl title={t("agent.serverAddress")} description={t("agent.serverAddressHint")}>
                    <div className="w-full sm:w-80">
                        <CopyField value={mcpServerUrl()} label={t("agent.serverAddress")} />
                    </div>
                </SettingsControl>
                <div className="flex flex-col gap-3 py-3.5">
                    <div className="space-y-0.5 select-none">
                        <h3 className="text-[13px] font-medium text-primary">{t("agent.claudeCodeCommand")}</h3>
                        <p className="text-[13px] text-tertiary">{t("agent.claudeCodeCommandHint")}</p>
                    </div>
                    <CopyField value={claudeCodeCommand()} label={t("agent.claudeCodeCommand")} wrap />
                    <p className="text-[13px] text-tertiary">
                        {t("agent.tokenPlaceholderHint")}{" "}
                        <Link to={urls.agentSettings("tokens")} className="text-primary underline decoration-subtle underline-offset-2 hover:decoration-current">
                            {t("nav.apiTokens")}
                        </Link>
                        .
                    </p>
                </div>
            </SettingsGroup>
            <SettingsGroup title={t("agent.tools")} description={t("agent.toolsDescription")}>
                <ToolList label={t("agent.read")} tools={READ_TOOLS} />
                <ToolList label={t("agent.write")} tools={WRITE_TOOLS} />
            </SettingsGroup>
        </SettingsPage>
    );
}

function ToolList({ label, tools }: { label: string; tools: ReadonlyArray<readonly [string, `agent.${string}`]> }) {
    const { t } = useTranslation();
    return (
        <div className="py-3.5">
            <p className="mb-2 text-[12px] text-tertiary select-none">{label}</p>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
                {tools.map(([name, description]) => (
                    <div key={name} className="contents">
                        <dt className="font-mono text-[12px] leading-5 text-primary">{name}</dt>
                        <dd className="text-[13px] leading-5 text-secondary">{t(description as "agent.toolSearch")}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
