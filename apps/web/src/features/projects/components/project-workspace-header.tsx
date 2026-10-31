import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { AppIcons } from "@/components/foundations/icons";
import { useAppNavigation } from "@/components/layout/app-shell";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import type { FavoriteTarget } from "@/features/favorites/api";
import { FavoriteStar } from "@/features/favorites/components/favorite-star";
import { useProject } from "@/features/projects/hooks/use-project";
import { useProjectPermissions } from "@/features/projects/hooks/use-project-permissions";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { ProjectIcon } from "./project-icon";
import { useTranslation } from "react-i18next";

export function ProjectWorkspaceHeader({
    projectId,
    activeView,
    actions,
    hideSection = false,
    favorite,
}: {
    projectId: string;
    actions?: ReactNode;
    /** Tabbed home screens already name the section in their tabs. */
    hideSection?: boolean;
    /** What the star favorites. Defaults to the project, or its issue list on issue screens; `null` hides it. */
    favorite?: FavoriteTarget | null;
    activeView: "overview" | "members" | "issues" | "board" | "documents" | "settings";
}) {
    const { data: projectData } = useProject(projectId);
    const { data: projects } = useProjects();
    const { isProjectOwner } = useProjectPermissions(projectId);
    const project = projectData ?? projects?.find((candidate) => candidate.id === projectId);
    const { t } = useTranslation();
    const { toggleSidebar } = useAppNavigation();
    const favoriteTarget: FavoriteTarget | null =
        favorite !== undefined
            ? favorite
            : activeView === "overview" || activeView === "members"
              ? { kind: "project", projectId }
              : activeView === "issues" || activeView === "board"
                ? { kind: "issues", projectId }
                : null;
    const showSection = !hideSection && activeView !== "overview" && activeView !== "members";
    const title = activeView === "issues" || activeView === "board" ? t("nav.issues") : activeView === "documents" ? t("nav.documents") : activeView === "settings" ? t("nav.projectSettings") : t("nav.overview");
    return (
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-subtle px-3">
            <div className="flex min-w-0 items-center gap-1 text-[13px]">
                <span className="md:hidden">
                    <ButtonUtility icon={AppIcons.Menu} color="tertiary" tooltip={t("nav.expand")} onClick={toggleSidebar} />
                </span>
                <span className="flex min-w-0 items-center gap-2" data-project-context="true" data-project-id={projectId} data-project-name={project?.name ?? t("projects.project")} data-project-issue-key={project?.issueKey ?? ""}>
                    <ProjectIcon icon={project?.iconAppearance ?? project?.icon} className="size-4 shrink-0" />
                    <Link to={`/projects/${projectId}`} className="truncate text-secondary hover:text-primary">{project?.name ?? t("projects.project")}</Link>
                </span>
                {showSection && (
                    <>
                        <ChevronRight className="size-3 shrink-0 text-placeholder" aria-hidden="true" />
                        <span className="truncate text-primary">{title}</span>
                    </>
                )}
                {favoriteTarget && <FavoriteStar target={favoriteTarget} />}
                {project && <ContextMenuButton entity={{ type: "project", projectId, name: project.name, issueKey: project.issueKey }} className="size-6" />}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {actions}
                {!actions && project?.repositoryUrl && (
                    <ButtonUtility icon={AppIcons.ExternalLink} color="tertiary" tooltip={t("projects.openRepository")} href={project.repositoryUrl} target="_blank" rel="noopener noreferrer" />
                )}
                {!actions && isProjectOwner && (
                    <Link to={`/projects/${projectId}/settings/general`} aria-label={t("nav.projectSettings")} className="flex size-6 items-center justify-center rounded text-tertiary hover:bg-layer-1-hover">
                        <AppIcons.Settings className="size-4" />
                    </Link>
                )}
            </div>
        </header>
    );
}
