import { useTranslation } from "react-i18next";
import type { IntegrationText } from "../catalog";

/** The MCP server's tools, as `mcp.server.ts` registers them. */
const READ_TOOLS: Array<[string, IntegrationText]> = [
    ["list_projects", "integrations.toolListProjects"],
    ["list_issues", "integrations.toolListIssues"],
    ["get_issue", "integrations.toolGetIssue"],
    ["search", "integrations.toolSearch"],
    ["get_document", "integrations.toolGetDocument"],
];
const WRITE_TOOLS: Array<[string, IntegrationText]> = [
    ["create_issue", "integrations.toolCreateIssue"],
    ["update_issue", "integrations.toolUpdateIssue"],
    ["add_comment", "integrations.toolAddComment"],
    ["create_document", "integrations.toolCreateDocument"],
];

/** What a connected tool can read and change in Rinia. */
export function McpToolList() {
    const { t } = useTranslation();
    return (
        <div className="grid gap-5 sm:grid-cols-2">
            {[
                ["integrations.read", READ_TOOLS],
                ["integrations.write", WRITE_TOOLS],
            ].map(([label, tools]) => (
                <div key={label as string}>
                    <p className="mb-2 text-[12px] font-medium tracking-wide text-tertiary uppercase select-none">{t(label as "integrations.read")}</p>
                    <ul className="space-y-2.5">
                        {(tools as Array<[string, IntegrationText]>).map(([name, description]) => (
                            <li key={name}>
                                <code className="font-mono text-[12px] text-primary">{name}</code>
                                <p className="text-[13px] leading-5 text-tertiary">{t(description as "integrations.toolSearch")}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
