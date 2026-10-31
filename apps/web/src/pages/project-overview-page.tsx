import { Link, useParams } from "react-router";
import { Skeleton } from "@/components/base/feedback/skeleton";
import { ErrorMessage } from "@/components/feedback/error-message";
import { AppIcons } from "@/components/foundations/icons";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { ProjectWorkspaceHeader } from "@/features/projects/components/project-workspace-header";
import { useProject } from "@/features/projects/hooks/use-project";
import { useProjectMembers } from "@/features/projects/hooks/use-project-members";
import { useTranslation } from "react-i18next";

export const ProjectOverviewPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { t } = useTranslation();
    const { data: project, isLoading, isError } = useProject(projectId!);
    const { data: documents } = useDocuments(projectId!);
    const { data: members } = useProjectMembers(projectId!);
    const overviewLoading = isLoading;
    const overviewError = isError;

    return (
        <div className="flex h-full min-h-0 flex-col bg-surface-1">
            <ProjectWorkspaceHeader projectId={projectId!} activeView="overview" />
            <div className="flex h-9 shrink-0 items-center gap-1 border-b border-subtle px-4">
                <HomeTab to={`/projects/${projectId}`} label={t("nav.overview")} current />
                <HomeTab to={`/projects/${projectId}/documents`} label={t("nav.documents")} />
                <HomeTab to={`/projects/${projectId}/settings/members`} label={t("settings.members")} />
            </div>
            <main className="min-h-0 w-full flex-1 overflow-y-auto">
                {overviewLoading ? (
                    <OverviewSkeleton />
                ) : overviewError || !project ? (
                    <ErrorMessage message={t("errors.requestFailed")} />
                ) : (
                <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="px-8 py-8">
                        <div className="flex items-center gap-3">
                            <span className="grid size-8 place-items-center rounded-md bg-accent-primary text-white">
                                <ProjectIcon icon={project.iconAppearance ?? project.icon} className="size-4" />
                            </span>
                            <h1 className="text-xl font-semibold tracking-tight text-primary">{project.name}</h1>
                        </div>
                        {project.description ? (
                            <p className="mt-4 max-w-2xl text-[13px] leading-5 text-secondary">{project.description}</p>
                        ) : (
                            <Link to={`/projects/${projectId}/settings/general`} className="mt-4 inline-block text-[13px] text-placeholder hover:text-secondary">{t("projects.addDescription")}</Link>
                        )}
                        <h2 className="mt-10 text-sm font-medium text-primary">{t("projects.homeResources")}</h2>
                        <p className="mt-1 text-[13px] text-tertiary">{t("projects.homeResourcesHint")}</p>
                        <div className="mt-4 divide-y divide-subtle">
                            {documents?.map((document) => (
                                <Link key={document.id} to={`/projects/${projectId}/documents/${document.id}`} className="flex h-8 items-center gap-2 text-[13px] text-secondary hover:text-primary">
                                    <AppIcons.Documents className="size-4 text-tertiary" />
                                    <span className="truncate">{document.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                    <aside className="border-l border-subtle px-4 py-6">
                        <h2 className="text-[13px] text-secondary">{t("settings.members")}</h2>
                        <div className="mt-2 flex items-center">
                            {(members ?? []).slice(0, 5).map((member) => (
                                <span key={member.id} title={member.name} className="mr-1 inline-flex size-6 items-center justify-center overflow-hidden rounded-full bg-layer-3 text-[10px] text-primary">
                                    {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="size-full object-cover" /> : member.name.slice(0, 1)}
                                </span>
                            ))}
                        </div>
                        <h2 className="mt-6 text-[13px] text-secondary">{t("projects.goTo")}</h2>
                        <nav className="mt-2 grid gap-1">
                            <GoTo to={`/projects/${projectId}/settings/general`} icon={AppIcons.Settings} label={t("nav.projectSettings")} />
                            <GoTo to={`/projects/${projectId}/issues/list`} icon={AppIcons.Issues} label={t("nav.issues")} />
                            <GoTo to={`/projects/${projectId}/documents`} icon={AppIcons.Documents} label={t("nav.documents")} />
                            <GoTo to={`/projects/${projectId}/board`} icon={AppIcons.Board} label={t("projects.board")} />
                        </nav>
                    </aside>
                </div>
                )}
            </main>
        </div>
    );
};

function OverviewSkeleton() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col" role="status" aria-label={t("common.loading")} aria-live="polite">
            <div className="space-y-3 border-b border-subtle pb-6">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-72 max-w-full" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="grid gap-6 border-b border-subtle py-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                    <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-64 max-w-full" /></div>
                    <div className="space-y-3 rounded-lg border border-subtle p-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1"><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" /></div>
            </div>
            <section className="space-y-4 py-6">
                <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-72 max-w-full" /></div>
                <div className="space-y-3 rounded-lg border border-subtle p-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            </section>
        </div>
    );
}

function HomeTab({ to, label, current = false }: { to: string; label: string; current?: boolean }) {
    return (
        <Link to={to} aria-current={current ? "page" : undefined} className={`flex h-6 items-center rounded-md px-2 text-[13px] ${current ? "bg-layer-1-selected text-primary" : "text-tertiary hover:bg-layer-transparent-hover hover:text-primary"}`}>
            {label}
        </Link>
    );
}

function GoTo({ to, icon: Icon, label }: { to: string; icon: typeof AppIcons.Issues; label: string }) {
    return (
        <Link to={to} className="flex h-7 items-center gap-2 rounded-md px-1 text-[13px] text-secondary hover:bg-layer-transparent-hover hover:text-primary">
            <Icon className="size-4 text-tertiary" />
            {label}
        </Link>
    );
}
