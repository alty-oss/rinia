import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Circle, House, Search, ShieldCheck, SlidersHorizontal, SquarePen, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
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

const OPEN_PROJECTS_KEY = "rinia-open-projects";
const OPEN_DOCS_KEY = "rinia-open-project-docs";
const SECTIONS_KEY = "rinia-sidebar-sections";
const ITEM = "flex h-7 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-left text-[13px] font-medium";
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
                <SettingsNav projectId={projectId} projects={projects} />
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
                            className="flex size-7 items-center justify-center rounded-lg bg-layer-1 text-tertiary hover:bg-layer-1-hover hover:text-primary"
                            onClick={(event) => {
                                event.stopPropagation();
                                if (createTarget) setCreatingProjectId(createTarget);
                            }}
                        >
                            <SquarePen className="size-4" />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-1 pb-2">
                        <Link to="/" className={itemClass(location.pathname === "/")} aria-current={location.pathname === "/" ? "page" : undefined}>
                            <AppIcons.Projects className="size-4 shrink-0" />
                            <span className="truncate">{t("nav.allProjects")}</span>
                        </Link>
                        <SectionLabel label={t("nav.yourProjects")} open={sections.projects} onToggle={toggleProjects} />
                        {sections.projects && (projects ?? []).map((project) => (
                            <ProjectNavItem
                                key={project.id}
                                project={project}
                                currentProjectId={routeProjectId}
                                open={openProjectId === project.id}
                                docsOpen={openDocs.has(project.id)}
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

function SettingsNav({ projectId, projects }: { projectId: string; projects: ProjectCardSummary[] | undefined }) {
    const { t } = useTranslation();
    const location = useLocation();
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());
    const link = (path: string, label: string, Icon: AppIcon, active = location.pathname === path) =>
        matches(label) && (
            <Link key={path} to={path} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
            </Link>
        );
    const personal = [link("/settings/preferences", t("nav.preferences"), SlidersHorizontal), link("/settings/profile", t("nav.profile"), UserRound)].filter(Boolean);
    const projectLinks = (projects ?? []).filter((project) => matches(project.name));
    const admin = user?.isAdmin ? [link("/settings/admin", t("nav.administration"), ShieldCheck)].filter(Boolean) : [];

    return (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-4">
            <Link to={projectId ? `/projects/${projectId}` : "/"} className={`${itemClass(false)} mb-3`}>
                <AppIcons.Back className="size-4" />
                {t("nav.backToApp")}
            </Link>
            <label className="mb-2 flex h-8 w-full items-center gap-2 rounded-md border border-subtle px-2 text-[13px] focus-within:border-accent-strong">
                <Search className="size-3.5 shrink-0 text-placeholder" />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("nav.searchSettings")}
                    aria-label={t("nav.searchSettings")}
                    className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-placeholder"
                />
            </label>
            {personal.length > 0 && <SettingsNavSection label={t("nav.personal")}>{personal}</SettingsNavSection>}
            {projectLinks.length > 0 && (
                <SettingsNavSection label={t("nav.yourProjects")}>
                    {projectLinks.map((project) => {
                        const path = `/projects/${project.id}/settings`;
                        const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
                        return (
                            <Link key={project.id} to={path} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                                <ProjectIcon icon={project.iconAppearance ?? project.icon} className="size-4 shrink-0" />
                                <span className="truncate">{project.name}</span>
                            </Link>
                        );
                    })}
                </SettingsNavSection>
            )}
            {admin.length > 0 && <SettingsNavSection label={t("nav.administration")}>{admin}</SettingsNavSection>}
            {query && personal.length + projectLinks.length + admin.length === 0 && <p className="px-2 py-3 text-[13px] text-placeholder">{t("nav.noSettingsFound")}</p>}
        </div>
    );
}

function SettingsNavSection({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="mt-4">
            <p className="px-2 pb-1.5 text-[12px] text-tertiary">{label}</p>
            <div className="flex flex-col gap-px">{children}</div>
        </div>
    );
}

function SectionLabel({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="group/section mt-5 mb-0.5 flex h-6 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-tertiary hover:text-secondary"
        >
            {label}
            <span className="text-placeholder group-hover/section:text-tertiary"><Caret open={open} /></span>
        </button>
    );
}

/** Small solid triangle placed after a label, as in Linear's section and team headers. */
function Caret({ open }: { open: boolean }) {
    return (
        <svg viewBox="0 0 8 8" className={`size-2 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true">
            <path d="M1 2.25h6L4 6.25z" fill="currentColor" />
        </svg>
    );
}

function ProjectNavItem({
    project,
    currentProjectId,
    open,
    docsOpen,
    onToggle,
    onToggleDocs,
    onOpenDocs,
}: {
    project: ProjectCardSummary;
    currentProjectId: string;
    open: boolean;
    docsOpen: boolean;
    onToggle: () => void;
    onToggleDocs: () => void;
    onOpenDocs: () => void;
}) {
    const location = useLocation();
    const { t } = useTranslation();
    const current = currentProjectId === project.id;
    const home = location.pathname === `/projects/${project.id}`;
    const issues = current && /\/issues(\/|$)/.test(location.pathname);
    const documentsIndex = location.pathname === `/projects/${project.id}/documents`;

    return (
        <div className="group/project">
            <button
                type="button"
                aria-expanded={open}
                onClick={onToggle}
                className={`${ITEM} ${IDLE}`}
                data-project-context="true"
                data-project-id={project.id}
                data-project-name={project.name}
                data-project-issue-key={project.issueKey}
            >
                <ProjectIcon icon={project.iconAppearance ?? project.icon} className="size-4 shrink-0" />
                <span className="truncate">{project.name}</span>
                <span className="text-placeholder"><Caret open={open} /></span>
            </button>
            {open && (
                <nav aria-label={project.name} className="ml-4 flex flex-col gap-px">
                    <ChildLink to={`/projects/${project.id}`} icon={House} label={t("nav.home")} active={home} />
                    <ChildLink to={`/projects/${project.id}/issues`} icon={Circle} label={t("nav.issues")} active={issues} />
                    <div className={`${ITEM} ${documentsIndex ? ACTIVE : IDLE} pr-1`}>
                        <Link to={`/projects/${project.id}/documents`} onClick={onOpenDocs} className="flex min-w-0 items-center gap-2.5 self-stretch" aria-current={documentsIndex ? "page" : undefined}>
                            <AppIcons.Documents className="size-4 shrink-0" />
                            <span className="truncate">{t("nav.documents")}</span>
                        </Link>
                        <button
                            type="button"
                            aria-expanded={docsOpen}
                            aria-label={docsOpen ? t("nav.collapsePages") : t("nav.expandPages")}
                            className="grid size-5 shrink-0 place-items-center rounded text-placeholder hover:text-primary"
                            onClick={onToggleDocs}
                        >
                            <Caret open={docsOpen} />
                        </button>
                        <Link to={`/projects/${project.id}/documents`} onClick={onOpenDocs} tabIndex={-1} aria-hidden="true" className="flex-1 self-stretch" />
                    </div>
                    {docsOpen && <ProjectDocumentsNav projectId={project.id} />}
                </nav>
            )}
        </div>
    );
}

function ChildLink({ to, icon: Icon, label, active }: { to: string; icon: AppIcon; label: string; active: boolean }) {
    return (
        <Link to={to} className={itemClass(active)} aria-current={active ? "page" : undefined}>
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
        </Link>
    );
}

function ProjectDocumentsNav({ projectId }: { projectId: string }) {
    const location = useLocation();
    const { data: documents } = useDocuments(projectId);

    return (
        <div className="ml-4 flex flex-col gap-px">
            {documents?.map((page) => {
                const active = location.pathname.endsWith(`/documents/${page.id}`);
                return (
                    <div key={page.id} className="group/doc relative flex min-w-0 items-center" data-document-context="true" data-project-id={projectId} data-document-id={page.id} data-document-title={page.title} data-document-author-id={page.createdBy}>
                        <Link to={`/projects/${projectId}/documents/${page.id}`} className={itemClass(active, "pr-7 font-normal")} aria-current={active ? "page" : undefined}>
                            {page.iconAppearance ? <ProjectIcon icon={page.iconAppearance} className="size-3.5 shrink-0" /> : <AppIcons.Documents className="size-3.5 shrink-0" />}
                            <span className="truncate">{page.title}</span>
                        </Link>
                        <ContextMenuButton
                            entity={{ type: "document", projectId, documentId: page.id, title: page.title, authorId: page.createdBy }}
                            className="absolute right-0.5 size-6 opacity-100 md:opacity-0 md:group-hover/doc:opacity-100 md:group-focus-within/doc:opacity-100"
                        />
                    </div>
                );
            })}
        </div>
    );
}
