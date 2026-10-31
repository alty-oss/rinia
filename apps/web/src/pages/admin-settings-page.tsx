import { Download } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { SettingsControl, SettingsGroup, SettingsPage } from "@/components/settings/settings-layout";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { NotFound } from "./not-found";

export function AdminSettingsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    if (!user?.isAdmin) return <NotFound />;
    return (
        <SettingsPage title={t("nav.administration")} description={t("settings.administrationDescription")}>
            <SettingsGroup title={t("settings.data")}>
                <SettingsControl title={t("profile.databaseBackup")} description={t("profile.backupDescription")}>
                    <Button href="/api/admin/backup" download color="secondary" size="sm" iconLeading={Download}>
                        {t("profile.downloadBackup")}
                    </Button>
                </SettingsControl>
            </SettingsGroup>
        </SettingsPage>
    );
}
