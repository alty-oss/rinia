import { Topbar } from "@/components/layout/topbar";
import { UserProfilePanel } from "@/features/auth/components/user-profile-panel";
import { useTranslation } from "react-i18next";

export function ProfileSettingsPage() {
    const { t } = useTranslation();
    return (
        <div className="flex h-full min-h-0 flex-col">
            <Topbar title={`${t("nav.settings")} / ${t("settings.general")}`} />
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="w-full px-4 py-4 md:px-6">
                    <UserProfilePanel />
                </div>
            </div>
        </div>
    );
}
