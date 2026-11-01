import { SettingsPage } from "@/components/settings/settings-layout";
import { ApiTokensPanel } from "@/features/auth/components/api-tokens-panel";
import { UserProfilePanel } from "@/features/auth/components/user-profile-panel";
import { useTranslation } from "react-i18next";

export function ProfileSettingsPage() {
    const { t } = useTranslation();
    return (
        <SettingsPage title={t("nav.profile")}>
            <UserProfilePanel />
            <ApiTokensPanel />
        </SettingsPage>
    );
}
