import { Fragment, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronRightOutline } from "@makeplane/propel/icons";
import { Circle, House, LayoutGrid, Search, SquarePen, UserRound, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { AppIcons } from "@/components/foundations/icons";
import type { AppIcon } from "@/components/foundations/icons";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import { SidebarAccount } from "./sidebar-account";
import { useColumns } from "@/features/board/hooks/use-board";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { IssueQuickCreateModal } from "@/features/issues/components/issue-quick-create-modal";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import type { ProjectCardSummary } from "@/features/projects/api";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useTranslation } from "react-i18next";

const OPEN_PROJECTS_KEY = "rinia-open-projects";
const OPEN_DOCS_KEY = "rinia-open-project-docs";
const SECTIONS_KEY = "rinia-sidebar-sections";
const ITEM = "flex h-7 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-[13px]";
const IDLE = "text-tertiary hover:bg-layer-transparent-hover hover:text-primary";
const ACTIVE = "bg-layer-1-selected text-white [&_svg]:text-white";

function itemClass(active: boolean, extra = "") {
    return `${ITEM} ${active ? ACTIVE : IDLE} ${extra}`;
}

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

function readOpenProjectId(): string | null {
    return [...readIdSet(OPEN_PROJECTS_KEY)].at(-1) ?? null;
}

function storeOpenProject(id: string) {
    localStorage.setItem(OPEN_PROJECTS_KEY, JSON.stringify([id]));
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

function readSections(): { projects: boolean } {
    const fallback = { projects: true };
    try {
        const stored = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? "null") as { projects?: boolean; teams?: boolean } | null;
        if (stored && typeof stored === "object") {
            if (typeof stored.projects === "boolean") return { projects: stored.projects };
            if (typeof stored.teams === "boolean") return { projects: stored.teams };
        }
    } catch {
        /* ignore invalid storage */
    }
    return fallback;
}

export function Sidebar({ onSearch, onNavigate }: { onSearch: () => void; onNavigate?: () => void }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { data: projects } = useProjects();
    const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? readOpenProjectId() ?? "";
    const routeProjectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? "";
    const { data: columns } = useColumns(routeProjectId);
    const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);
    const [openProjectId, setOpenProjectId] = useState<string | null>(() => routeProjectId || readOpenProjectId());
    const [openDocs, setOpenDocs] = useState(() => readIdSet(OPEN_DOCS_KEY));
    const [sections, setSections] = useState(readSections);
    const settings = location.pathname.includes("/settings");
    useEffect(() => setCreatingProjectId(null), [routeProjectId]);
    useEffect(() => {
        if (!routeProjectId) return;
        setOpenProjectId(routeProjectId);
        storeOpenProject(routeProjectId);
    }, [routeProjectId]);

    function toggleProjects() {
        setSections((current) => {
            const next = { projects: !current.projects };
            localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
            return next;
        });
    }

    function go(path: string) {
        onNavigate?.();
        navigate(path);
    }

    const createTarget = routeProjectId || openProjectId || projects?.[0]?.id || "";

    return (
        <div className="flex h-full flex-col">
            {settings ? (
                <SettingsNav projectId={projectId} onSearch={onSearch} />
            ) : (
                <>
                    <div className="flex h-12 shrink-0 items-center gap-1 px-3">
                        <SidebarAccount variant="header" />
                        <button type="button" aria-label={t("nav.search")} className="flex size-7 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover hover:text-primary" onClick={(event) => { event.stopPropagation(); onSearch(); }}>
                            <Search className="size-4" />
                        </button>
                        <button
                            type="button"
                            aria-label={t("nav.newIssue")}
                            className="flex size-7 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover hover:text-primary"
                            onClick={(event) => {
                                event.stopPropagation();
                                if (createTarget) setCreatingProjectId(createTarget);
                            }}
                        >
                            <SquarePen className="size-4" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
                        <SectionLabel label={t("nav.projects")} open={sections.projects} to="/" onToggle={toggleProjects} />
                        {sections.projects && (projects ?? []).map((project) => (
                            <ProjectNavItem
                                key={project.id}
                                project={project}
                                currentProjectId={routeProjectId}
                                open={openProjectId === project.id}
                                docsOpen={openDocs.has(project.id)}
                                onOpen={() => {
                                    setOpenProjectId(project.id);
                                    storeOpenProject(project.id);
                                }}
                                onToggle={() => {
                                    setOpenProjectId((current) => {
                                        if (current === project.id) return null;
                                        storeOpenProject(project.id);
                                        return project.id;
                                    });
                                }}
                                onToggleDocs={() => toggleStoredId(OPEN_DOCS_KEY, setOpenDocs, project.id)}
                                onOpenDocs={() => openStoredId(OPEN_DOCS_KEY, setOpenDocs, project.id)}
                            />
                        ))}
                    </div>
                </>
            )}
            {creatingProjectId && columns?.[0] && creatingProjectId === routeProjectId && (
                <IssueQuickCreateModal
                    projectId={creatingProjectId}
                    columnId={columns[0].id}
                    onClose={() => setCreatingProjectId(null)}
                    onCreated={(identifier) => {
                        setCreatingProjectId(null);
                        go(`/projects/${creatingProjectId}/issues/${identifier}`);
                    }}
                />
            )}
            {creatingProjectId && creatingProjectId !== routeProjectId && (
                <CreateElsewhere projectId={creatingProjectId} onClose={() => setCreatingProjectId(null)} onCreated={(identifier) => go(`/projects/${creatingProjectId}/issues/${identifier}`)} />
            )}
        </div>
    );
}

function CreateElsewhere({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (identifier: string) => void }) {
    const { data: columns } = useColumns(projectId);
    if (!columns?.[0]) return null;
    return <IssueQuickCreateModal projectId={projectId} columnId={columns[0].id} onClose={onClose} onCreated={onCreated} />;
}

function SectionLabel({ label, open, onToggle, to }: { label: string; open: boolean; onToggle: () => void; to: string }) {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <div className="mt-3 flex h-7 w-full items-center gap-1 px-2 text-[12px] text-tertiary">
            <button type="button" aria-expanded={open} aria-label={label} className="flex size-4 items-center justify-center hover:text-secondary" onClick={(event) => { event.stopPropagation(); onToggle(); }}>
                <ChevronRightOutline className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            <Link to={to} className={`min-w-0 flex-1 truncate text-left ${active ? "text-white" : "text-tertiary hover:text-secondary"}`} aria-current={active ? "page" : undefined}>{label}</Link>
        </div>
    );
}

function SettingsNav({ projectId, onSearch }: { projectId: string; onSearch: () => void }) {
    const { t } = useTranslation();
    const location = useLocation();
    const item = (path: string) => itemClass(location.pathname === path);
    return (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
            <Link to={projectId ? `/projects/${projectId}` : "/"} className={`${itemClass(false)} mb-3`}>
                <AppIcons.Back className="size-4" />
                {t("nav.backToApp")}
            </Link>
            <button type="button" onClick={onSearch} className="mb-4 flex h-8 w-full items-center gap-2 rounded-md border border-subtle px-2 text-[13px] text-placeholder hover:bg-layer-transparent-hover">
                <Search className="size-3.5" />
                {t("nav.search")}
            </button>
            <p className="px-2 py-2 text-[12px] text-tertiary">{t("nav.personal")}</p>
            <Link to="/settings/preferences" className={item("/settings/preferences")} aria-current={location.pathname === "/settings/preferences" ? "page" : undefined}>
                <AppIcons.Settings className="size-4" />
                {t("nav.preferences")}
            </Link>
            <Link to="/settings/profile" className={item("/settings/profile")} aria-current={location.pathname === "/settings/profile" ? "page" : undefined}>
                <UserRound className="size-4" />
                {t("nav.profile")}
            </Link>
            {projectId && (
                <>
                    <p className="mt-4 px-2 py-2 text-[12px] text-tertiary">{t("nav.projects")}</p>
                    {[
                        ["general", t("settings.general"), AppIcons.General],
                        ["states", t("settings.states"), Circle],
                        ["members", t("settings.members"), Users],
                        ["labels", t("settings.labels"), LayoutGrid],
                    ].map(([section, label, Icon]) => {
                        const path = `/projects/${projectId}/settings/${section}`;
                        const IconComponent = Icon as AppIcon;
                        return (
                            <Link key={String(section)} to={path} className={item(path)} aria-current={location.pathname === path ? "page" : undefined}>
                                <IconComponent className="size-4 shrink-0" />
                                {label as string}
                            </Link>
                        );
                    })}
                </>
            )}
        </div>
    );
}

function ProjectNavItem({
    project,
    currentProjectId,
    open,
    docsOpen,
    onOpen,
    onToggle,
    onToggleDocs,
    onOpenDocs,
}: {
    project: ProjectCardSummary;
    currentProjectId: string;
    open: boolean;
    docsOpen: boolean;
    onOpen: () => void;
    onToggle: () => void;
    onToggleDocs: () => void;
    onOpenDocs: () => void;
}) {
    const location = useLocation();
    const { t } = useTranslation();
    const current = currentProjectId === project.id;
    const home = location.pathname === `/projects/${project.id}`;
    const issues = current && /\/issues(\/|$)/.test(location.pathname);
    const documents = current && location.pathname.includes("/documents");

    return (
        <div className="group/project">
            <div className="flex min-w-0 items-center" data-project-context="true" data-project-id={project.id} data-project-name={project.name} data-project-issue-key={project.issueKey}>
                <Link to={`/projects/${project.id}`} onClick={onOpen} className={`${ITEM} min-w-0 flex-1 ${open ? "text-secondary hover:bg-layer-transparent-hover hover:text-primary" : IDLE}`}>
                    <ProjectIcon icon={project.iconAppearance ?? project.icon} className="size-4 shrink-0" />
                    <span className="truncate">{project.name}</span>
                </Link>
                <button type="button" aria-expanded={open} aria-label={open ? t("nav.collapseProject") : t("nav.expandProject")} className="flex size-6 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover" onClick={onToggle}>
                    <ChevronRightOutline className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
            </div>
            {open && (
                <nav aria-label={`${project.name} views`}>
                    <ChildLink to={`/projects/${project.id}`} icon={House} label={t("nav.home")} active={home} />
                    <ChildLink to={`/projects/${project.id}/issues`} icon={Circle} label={t("nav.issues")} active={issues} />
                    <div className="flex min-w-0 items-center">
                        <Link to={`/projects/${project.id}/documents`} onClick={onOpenDocs} className={itemClass(documents && location.pathname === `/projects/${project.id}/documents`, "pl-7")}>
                            <AppIcons.Documents className="size-4 shrink-0" />
                            <span className="truncate">{t("nav.documents")}</span>
                        </Link>
                        <button type="button" aria-expanded={docsOpen} aria-label={docsOpen ? t("nav.collapsePages") : t("nav.expandPages")} className="flex size-6 items-center justify-center rounded-md text-tertiary hover:bg-layer-transparent-hover" onClick={onToggleDocs}>
                            <ChevronRightOutline className={`size-3 transition-transform ${docsOpen ? "rotate-90" : ""}`} />
                        </button>
                    </div>
                    {docsOpen && (
                        <div className="pl-4">
                            <ProjectDocumentsNav projectId={project.id} />
                        </div>
                    )}
                </nav>
            )}
        </div>
    );
}

function ChildLink({ to, icon: Icon, label, active }: { to: string; icon: AppIcon; label: string; active: boolean }) {
    return (
        <Link to={to} className={itemClass(active, "pl-7")} aria-current={active ? "page" : undefined}>
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
        </Link>
    );
}

function ProjectDocumentsNav({ projectId }: { projectId: string }) {
    const location = useLocation();
    const { data: documents } = useDocuments(projectId);

    return (
        <>
            {documents?.map((page) => (
                <Fragment key={page.id}>
                    <div className="flex min-w-0 items-center" data-document-context="true" data-project-id={projectId} data-document-id={page.id} data-document-title={page.title} data-document-author-id={page.createdBy}>
                        <Link
                            to={`/projects/${projectId}/documents/${page.id}`}
                            className={itemClass(location.pathname.endsWith(`/documents/${page.id}`), "pl-7 text-[12px]")}
                            aria-current={location.pathname.endsWith(`/documents/${page.id}`) ? "page" : undefined}
                        >
                            {page.iconAppearance ? <ProjectIcon icon={page.iconAppearance} className="size-3 shrink-0" /> : <AppIcons.Documents className="size-3 shrink-0" />}
                            <span className="truncate">{page.title}</span>
                        </Link>
                        <ContextMenuButton
                            entity={{ type: "document", projectId, documentId: page.id, title: page.title, authorId: page.createdBy }}
                            className="size-6 opacity-100 md:opacity-0 md:group-hover/project:opacity-100"
                        />
                    </div>
                </Fragment>
            ))}
        </>
    );
}
