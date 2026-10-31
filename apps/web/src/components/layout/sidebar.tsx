import { Fragment, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { AddOutline, ChevronDownOutline, ChevronRightOutline, LabelsOutline, MembersOutline, StateOutline } from "@makeplane/propel/icons";
import { Link, useLocation, useNavigate } from "react-router";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { AppIcons } from "@/components/foundations/icons";
import type { AppIcon } from "@/components/foundations/icons";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import { SidebarAccount } from "./sidebar-account";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useColumns } from "@/features/board/hooks/use-board";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { IssueQuickCreateModal } from "@/features/issues/components/issue-quick-create-modal";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import type { ProjectCardSummary } from "@/features/projects/api";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useTranslation } from "react-i18next";

const PROJECTS_GROUP_KEY = "rinia-projects-expanded";
const OPEN_PROJECTS_KEY = "rinia-open-projects";
const OPEN_DOCS_KEY = "rinia-open-project-docs";
const NAV_CLASS = "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-secondary hover:bg-layer-transparent-hover";
const PROJECT_VIEWS: Array<[string, "overview" | "issues" | "cycles" | "documents", AppIcon]> = [
    ["", "overview", AppIcons.Overview],
    ["/issues", "issues", AppIcons.Issues],
    ["/cycles", "cycles", AppIcons.Cycles],
    ["/documents", "documents", AppIcons.Documents],
];

function readIdSet(key: string): Set<string> {
    try {
        const stored = JSON.parse(localStorage.getItem(key) ?? "null");
        if (Array.isArray(stored)) return new Set(stored.filter((id): id is string => typeof id === "string"));
    } catch {
        /* ignore invalid storage */
    }
    return new Set();
}

function persistIdSet(key: string, ids: Set<string>) {
    localStorage.setItem(key, JSON.stringify([...ids]));
}

function toggleStoredId(key: string, setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persistIdSet(key, next);
        return next;
    });
}

function openStoredId(key: string, setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
        if (current.has(id)) return current;
        const next = new Set(current);
        next.add(id);
        persistIdSet(key, next);
        return next;
    });
}

export function Sidebar({ onCollapse }: { onCollapse: () => void }) {
    const location = useLocation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { data: projects } = useProjects();
    const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? "";
    const { data: columns } = useColumns(projectId);
    const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(() => localStorage.getItem(PROJECTS_GROUP_KEY) !== "false");
    const [openProjects, setOpenProjects] = useState(() => {
        const stored = readIdSet(OPEN_PROJECTS_KEY);
        if (projectId) stored.add(projectId);
        return stored;
    });
    const [openDocs, setOpenDocs] = useState(() => {
        const stored = readIdSet(OPEN_DOCS_KEY);
        if (projectId && location.pathname.includes("/documents")) stored.add(projectId);
        return stored;
    });
    const settings = location.pathname === "/settings/profile";
    const projectSettings = location.pathname.includes("/settings/");
    useEffect(() => setCreatingProjectId(null), [projectId]);
    useEffect(() => {
        if (projectId) openStoredId(OPEN_PROJECTS_KEY, setOpenProjects, projectId);
    }, [projectId]);
    useEffect(() => {
        if (projectId && location.pathname.includes("/documents")) openStoredId(OPEN_DOCS_KEY, setOpenDocs, projectId);
    }, [projectId, location.pathname]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-11 shrink-0 items-center justify-between px-3">
                <span className="truncate text-sm font-medium">{settings ? t("nav.settings") : projectSettings ? t("nav.projectSettings") : t("nav.projects")}</span>
                <ButtonUtility icon={AppIcons.Menu} tooltip={t("nav.collapse")} color="tertiary" onClick={onCollapse} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2">
                {settings ? (
                    <>
                        <div className="mb-6 flex min-w-0 items-center gap-3 px-2 py-2">
                            <Avatar key={user?.avatarUrl} size="md" src={user?.avatarUrl} initials={user?.name.slice(0, 2).toUpperCase()} />
                            <div className="min-w-0">
                                <p className="truncate text-body-sm-medium text-secondary">{user?.name}</p>
                                <p className="truncate text-caption-md-regular text-tertiary">{user?.email}</p>
                            </div>
                        </div>
                        <p className="px-2 py-2 text-caption-md-medium text-tertiary">{t("nav.account")}</p>
                        <Link to="/settings/profile" className={`${NAV_CLASS} bg-layer-1`} aria-current="page">
                            <AppIcons.General className="size-4" />
                            {t("settings.general")}
                        </Link>
                    </>
                ) : projectSettings ? (
                    <>
                        <Link to={`/projects/${projectId}`} className={`${NAV_CLASS} mb-4`}>
                            <AppIcons.Back className="size-4" />
                            {t("common.back")}
                        </Link>
                        {[
                            { section: "general", label: t("settings.general"), Icon: AppIcons.General },
                            { section: "states", label: t("settings.states"), Icon: StateOutline },
                            { section: "members", label: t("settings.members"), Icon: MembersOutline },
                            { section: "labels", label: t("settings.labels"), Icon: LabelsOutline },
                        ].map(({ section, label, Icon }) => (
                            <Link
                                key={section}
                                to={`/projects/${projectId}/settings/${section}`}
                                className={`${NAV_CLASS} ${location.pathname.endsWith(`/${section}`) ? "bg-layer-1 text-primary" : ""}`}
                                aria-current={location.pathname.endsWith(`/${section}`) ? "page" : undefined}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </Link>
                        ))}
                    </>
                ) : (
                    <>
                        {projectId && (
                            <Button size="sm" color="secondary" className="mb-2 w-full justify-start" iconLeading={AddOutline} onClick={() => setCreatingProjectId(projectId)}>
                                {t("nav.newIssue")}
                            </Button>
                        )}
                        <Link
                            to="/"
                            className={`${NAV_CLASS} ${location.pathname === "/" ? "bg-layer-1 text-primary" : ""}`}
                            aria-current={location.pathname === "/" ? "page" : undefined}
                        >
                            <AppIcons.Projects className="size-4" />
                            {t("nav.allProjects")}
                        </Link>
                        <button
                            type="button"
                            className="mt-3 mb-0.5 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-medium tracking-wide text-tertiary uppercase"
                            aria-expanded={expanded}
                            onClick={() =>
                                setExpanded((value) => {
                                    localStorage.setItem(PROJECTS_GROUP_KEY, String(!value));
                                    return !value;
                                })
                            }
                        >
                            <ChevronDownOutline className={`size-3 transition-transform ${expanded ? "" : "-rotate-90"}`} />
                            {t("nav.projects")}
                        </button>
                        {expanded &&
                            (projects ?? []).map((project) => (
                                <ProjectNavItem
                                    key={project.id}
                                    project={project}
                                    currentProjectId={projectId}
                                    open={openProjects.has(project.id)}
                                    docsOpen={openDocs.has(project.id)}
                                    onToggle={() => toggleStoredId(OPEN_PROJECTS_KEY, setOpenProjects, project.id)}
                                    onToggleDocs={() => toggleStoredId(OPEN_DOCS_KEY, setOpenDocs, project.id)}
                                />
                            ))}
                    </>
                )}
            </div>
            <div className="shrink-0 border-t border-subtle px-2 py-2">
                <SidebarAccount variant="row" />
            </div>
            {creatingProjectId === projectId && projectId && columns?.[0] && (
                <IssueQuickCreateModal
                    projectId={projectId}
                    columnId={columns[0].id}
                    onClose={() => setCreatingProjectId(null)}
                    onCreated={(identifier) => {
                        setCreatingProjectId(null);
                        navigate(`/projects/${projectId}/issues/${identifier}`);
                    }}
                />
            )}
        </div>
    );
}

function ProjectNavItem({
    project,
    currentProjectId,
    open,
    docsOpen,
    onToggle,
    onToggleDocs,
}: {
    project: ProjectCardSummary;
    currentProjectId: string;
    open: boolean;
    docsOpen: boolean;
    onToggle: () => void;
    onToggleDocs: () => void;
}) {
    const location = useLocation();
    const { t } = useTranslation();
    const current = currentProjectId === project.id;

    return (
        <div className="group/project">
            <div
                className="flex min-w-0 items-center"
                data-project-context="true"
                data-project-id={project.id}
                data-project-name={project.name}
                data-project-issue-key={project.issueKey}
            >
                <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? t("nav.collapseProject") : t("nav.expandProject")} ${project.name}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                    onClick={onToggle}
                >
                    <ChevronRightOutline className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
                <Link
                    to={`/projects/${project.id}`}
                    className={`${NAV_CLASS} min-w-0 flex-1 font-medium ${current ? "text-primary" : ""}`}
                >
                    <ProjectIcon icon={project.iconAppearance ?? project.icon} className="size-4 shrink-0 text-tertiary" />
                    <span className="truncate">{project.name}</span>
                </Link>
                <ContextMenuButton
                    entity={{ type: "project", projectId: project.id, name: project.name, issueKey: project.issueKey }}
                    className="opacity-100 md:opacity-0 md:group-hover/project:opacity-100 md:group-focus-within/project:opacity-100"
                />
            </div>
            {open && (
                <nav aria-label={`${project.name} views`} className="ml-4 border-l border-subtle pl-2">
                    {PROJECT_VIEWS.map(([suffix, key, Icon]) => {
                        const label = t(`nav.${key}`);
                        const active =
                            suffix === "/issues"
                                ? current && /\/(issues|board)(\/|$)/.test(location.pathname)
                                : location.pathname === `/projects/${project.id}${suffix}`;
                        if (suffix === "/documents") {
                            return (
                                <Fragment key={label}>
                                    <div className="flex min-w-0 items-center">
                                        <Link
                                            to={`/projects/${project.id}/documents`}
                                            className={`${NAV_CLASS} min-w-0 flex-1 ${active ? "bg-layer-1 text-primary" : ""}`}
                                            aria-current={active ? "page" : undefined}
                                        >
                                            <Icon className="size-4 shrink-0" />
                                            {label}
                                        </Link>
                                        <button
                                            type="button"
                                            aria-expanded={docsOpen}
                                            aria-label={docsOpen ? t("nav.collapsePages") : t("nav.expandPages")}
                                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                                            onClick={onToggleDocs}
                                        >
                                            <ChevronRightOutline className={`size-3 transition-transform ${docsOpen ? "rotate-90" : ""}`} />
                                        </button>
                                    </div>
                                    {docsOpen && <ProjectDocumentsNav projectId={project.id} />}
                                </Fragment>
                            );
                        }
                        return (
                            <Link
                                key={label}
                                to={`/projects/${project.id}${suffix}`}
                                className={`${NAV_CLASS} ${active ? "bg-layer-1 text-primary" : ""}`}
                                aria-current={active ? "page" : undefined}
                            >
                                <Icon className="size-4 shrink-0" />
                                {label}
                            </Link>
                        );
                    })}
                    <Link to={`/projects/${project.id}/settings/general`} className={NAV_CLASS}>
                        <AppIcons.Settings className="size-4" />
                        {t("nav.settings")}
                    </Link>
                </nav>
            )}
        </div>
    );
}

function ProjectDocumentsNav({ projectId }: { projectId: string }) {
    const location = useLocation();
    const { data: documents } = useDocuments(projectId);

    return (
        <>
            {documents?.map((page) => (
                <div
                    key={page.id}
                    className="ml-4 flex min-w-0 items-center"
                    data-document-context="true"
                    data-project-id={projectId}
                    data-document-id={page.id}
                    data-document-title={page.title}
                    data-document-author-id={page.createdBy}
                >
                    <Link
                        to={`/projects/${projectId}/documents/${page.id}`}
                        className={`${NAV_CLASS} min-w-0 flex-1 ${location.pathname.endsWith(`/documents/${page.id}`) ? "bg-layer-1 text-primary" : ""}`}
                        aria-current={location.pathname.endsWith(`/documents/${page.id}`) ? "page" : undefined}
                    >
                        {page.iconAppearance ? <ProjectIcon icon={page.iconAppearance} className="size-3 shrink-0" /> : <AppIcons.Documents className="size-3 shrink-0" />}
                        <span className="truncate">{page.title}</span>
                    </Link>
                    <ContextMenuButton
                        entity={{ type: "document", projectId, documentId: page.id, title: page.title, authorId: page.createdBy }}
                        className="size-7 opacity-100 md:opacity-0 md:group-hover/project:opacity-100 md:group-focus-within/project:opacity-100"
                    />
                </div>
            ))}
        </>
    );
}
