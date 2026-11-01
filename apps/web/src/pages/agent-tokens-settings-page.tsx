import { SettingsPage } from "@/components/settings/settings-layout";
import { ApiTokensPanel } from "@/features/agent/components/api-tokens-panel";
import { useTranslation } from "react-i18next";

export function AgentTokensSettingsPage() {
    const { t } = useTranslation();
    return (
        <SettingsPage title={t("nav.apiTokens")} description={t("agent.apiTokensDescription")}>
            <ApiTokensPanel />
        </SettingsPage>
    );
}
