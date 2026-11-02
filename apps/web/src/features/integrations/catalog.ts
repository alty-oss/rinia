import type { SnippetLanguage } from "./highlight";
import { logos, type Logo } from "./logos";

/** A translation key in the `integrations` namespace. */
export type IntegrationText = `integrations.${string}`;

export type IntegrationCategory = "ai" | "engineering" | "communication";

export interface SetupStep {
    text: IntegrationText;
    /** Something to paste, built from the server address and the token (a placeholder until one is created). */
    snippet?: { language: SnippetLanguage; code: (setup: { url: string; token: string }) => string };
}

interface IntegrationBase {
    slug: string;
    name: string;
    category: IntegrationCategory;
    logo: Logo;
    tagline: IntegrationText;
}

/** A tool that connects through Rinia's MCP server today. */
export interface McpIntegration extends IntegrationBase {
    available: true;
    website: string;
    steps: SetupStep[];
    note?: IntegrationText;
}

export interface UpcomingIntegration extends IntegrationBase {
    available: false;
}

export type Integration = McpIntegration | UpcomingIntegration;

export const TOKEN_PLACEHOLDER = "rinia_...";

/**
 * Every integration, in the order the catalog shows them. The setup formats follow each client's documentation for a
 * remote HTTP server with a static bearer header.
 */
export const integrations: Integration[] = [
    {
        slug: "claude-code",
        name: "Claude Code",
        category: "ai",
        logo: logos.claudeCode,
        tagline: "integrations.claudeCodeTagline",
        available: true,
        website: "https://claude.com/product/claude-code",
        steps: [
            {
                text: "integrations.claudeCodeStep1",
                snippet: {
                    language: "bash",
                    code: ({ url, token }) => [`claude mcp add --transport http rinia \\`, `  ${url} \\`, `  --header "Authorization: Bearer ${token}"`].join("\n"),
                },
            },
            { text: "integrations.claudeCodeStep2" },
        ],
    },
    {
        slug: "claude",
        name: "Claude",
        category: "ai",
        logo: logos.claude,
        tagline: "integrations.claudeTagline",
        available: true,
        website: "https://claude.ai",
        steps: [
            { text: "integrations.claudeStep1" },
            { text: "integrations.claudeStep2", snippet: { language: "text", code: ({ url }) => url } },
            { text: "integrations.claudeStep3", snippet: { language: "text", code: ({ token }) => `Bearer ${token}` } },
        ],
        note: "integrations.claudeNote",
    },
    {
        slug: "github-copilot",
        name: "GitHub Copilot",
        category: "ai",
        logo: logos.githubCopilot,
        tagline: "integrations.copilotTagline",
        available: true,
        website: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
        steps: [
            {
                text: "integrations.copilotStep1",
                // The token is asked for when the server starts, so it never sits in a file that may be committed.
                snippet: {
                    language: "json",
                    code: ({ url }) =>
                        JSON.stringify(
                            {
                                inputs: [{ type: "promptString", id: "rinia-token", description: "Rinia API token", password: true }],
                                servers: { rinia: { type: "http", url, headers: { Authorization: "Bearer ${input:rinia-token}" } } },
                            },
                            null,
                            2,
                        ),
                },
            },
            { text: "integrations.copilotStep2" },
        ],
    },
    {
        slug: "codex",
        name: "Codex",
        category: "ai",
        logo: logos.codex,
        tagline: "integrations.codexTagline",
        available: true,
        website: "https://developers.openai.com/codex",
        steps: [
            { text: "integrations.codexStep1", snippet: { language: "bash", code: ({ token }) => `export RINIA_TOKEN="${token}"` } },
            {
                text: "integrations.codexStep2",
                snippet: { language: "toml", code: ({ url }) => [`[mcp_servers.rinia]`, `url = "${url}"`, `bearer_token_env_var = "RINIA_TOKEN"`].join("\n") },
            },
            { text: "integrations.codexStep3" },
        ],
    },
    {
        slug: "gemini-cli",
        name: "Gemini CLI",
        category: "ai",
        logo: logos.geminiCli,
        tagline: "integrations.geminiTagline",
        available: true,
        website: "https://github.com/google-gemini/gemini-cli",
        steps: [
            {
                text: "integrations.geminiStep1",
                snippet: { language: "json", code: ({ url, token }) => JSON.stringify({ mcpServers: { rinia: { httpUrl: url, headers: { Authorization: `Bearer ${token}` } } } }, null, 2) },
            },
            { text: "integrations.geminiStep2" },
        ],
    },
    {
        slug: "mcp",
        name: "MCP",
        category: "ai",
        logo: logos.mcp,
        tagline: "integrations.mcpTagline",
        available: true,
        website: "https://modelcontextprotocol.io",
        steps: [
            { text: "integrations.mcpStep1", snippet: { language: "text", code: ({ url }) => url } },
            { text: "integrations.mcpStep2", snippet: { language: "text", code: ({ token }) => `Authorization: Bearer ${token}` } },
        ],
        note: "integrations.mcpNote",
    },
    { slug: "github", name: "GitHub", category: "engineering", logo: logos.github, tagline: "integrations.githubTagline", available: false },
    { slug: "slack", name: "Slack", category: "communication", logo: logos.slack, tagline: "integrations.slackTagline", available: false },
    { slug: "discord", name: "Discord", category: "communication", logo: logos.discord, tagline: "integrations.discordTagline", available: false },
];

export const integrationCategories: Array<{ id: IntegrationCategory; label: IntegrationText }> = [
    { id: "ai", label: "integrations.categoryAi" },
    { id: "engineering", label: "integrations.categoryEngineering" },
    { id: "communication", label: "integrations.categoryCommunication" },
];

export function findIntegration(slug: string | undefined): McpIntegration | undefined {
    const found = integrations.find((integration) => integration.slug === slug);
    return found?.available ? found : undefined;
}

/** Where tools reach Rinia's MCP server: the same origin as the app, which serves or proxies the API. */
export function mcpServerUrl() {
    return `${window.location.origin}/api/mcp`;
}
