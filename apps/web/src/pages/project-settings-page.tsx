import { useParams } from "react-router";
import { SettingsPage } from "@/components/settings/settings-layout";
import { ColumnsPanel } from "@/features/board/components/columns-panel";
import { CategoriesPanel } from "@/features/categories/components/categories-panel";
import { MembersPanel } from "@/features/projects/components/members-panel";
import { ProjectDetailsPanel } from "@/features/projects/components/project-details-panel";
import { useProjectPermissions } from "@/features/projects/hooks/use-project-permissions";
import { useTranslation } from "react-i18next";
import { NotFound } from "./not-found";

const sections = { general: ProjectDetailsPanel, states: ColumnsPanel, members: MembersPanel, labels: CategoriesPanel };
export function ProjectSettingsPage() {
    const { projectId = "", section = "general" } = useParams();
    const { isProjectOwner } = useProjectPermissions(projectId);
    const { t } = useTranslation();
    const Panel = sections[section as keyof typeof sections];
    if (!Panel) return <NotFound />;
    const title = section === "states" ? t("settings.states") : section === "members" ? t("settings.members") : section === "labels" ? t("settings.labels") : t("settings.general");
    return (
        <SettingsPage title={title}>
            <Panel key={`${projectId}:${section}`} projectId={projectId} isProjectOwner={isProjectOwner} />
        </SettingsPage>
    );
}
