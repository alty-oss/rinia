import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/features/issues/api";
import { AddOutline, ChevronDownOutline } from "@makeplane/propel/icons";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import type { Location } from "react-router";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { Skeleton } from "@/components/base/feedback/skeleton";
import { ImportanceBadge } from "@/features/board/components/importance-badge";
import { useColumns } from "@/features/board/hooks/use-board";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCreateIssue, useIssues } from "@/features/issues/hooks/use-issues";
import { ProjectWorkspaceHeader } from "@/features/projects/components/project-workspace-header";
import { IssueToolbar } from "@/features/issues/components/issue-toolbar";
import { useProjectMembers } from "@/features/projects/hooks/use-project-members";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "react-i18next";
import { translateStatusName } from "@/i18n/status-label";

type OrderBy = "position" | "priority" | "updated" | "number";
type GroupBy = "none" | "status" | "assignee";

export const ProjectIssuesPage = () => {
    const { t } = useTranslation();
    const { projectId } = useParams<{ projectId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const orderBy = readOrder(searchParams.get("order"));
    const groupBy = readGroup(searchParams.get("group"));
    const search = searchParams.get("q") ?? "";
    const priority = searchParams.get("priority") ?? "";
    const status = searchParams.get("status") ?? "";
    const assignee = searchParams.get("assignee") ?? "";
    const category = searchParams.get("label") ?? "";
    const { data: issues, isLoading, isError } = useIssues(projectId!, { orderBy });
    const { data: columns } = useColumns(projectId!);
    const { data: categories } = useCategories(projectId!);
    const { data: members } = useProjectMembers(projectId!);
    const createIssue = useCreateIssue(projectId!);
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const columnById = useMemo(() => new Map((columns ?? []).map((column) => [column.id, column])), [columns]);
    const memberById = useMemo(() => new Map((members ?? []).map((member) => [member.id, member])), [members]);
    const categoryById = useMemo(() => new Map((categories ?? []).map((item) => [item.id, item])), [categories]);

    const filteredIssues = useMemo(
        () =>
            (issues ?? []).filter((issue) => {
                const textMatch = !search || `${issue.identifier} ${issue.title}`.toLowerCase().includes(search.toLowerCase());
                return (
                    textMatch &&
                    (!priority || issue.priority === priority) &&
                    (!status || issue.columnId === status) &&
                    (!assignee || issue.assigneeId === assignee) &&
                    (!category || issue.categoryId === category)
                );
            }),
        [assignee, category, issues, priority, search, status],
    );

    const groups = useMemo(() => {
        if (groupBy === "none") return [{ key: "all", label: null, issues: filteredIssues }];

        const grouped = new Map<string, Issue[]>();
        for (const issue of filteredIssues) {
            const key = groupBy === "status" ? issue.columnId : issue.assigneeId ?? "unassigned";
            grouped.set(key, [...(grouped.get(key) ?? []), issue]);
        }

        return [...grouped.entries()].map(([key, groupedIssues]) => ({
            key,
            label:
                groupBy === "status"
                    ? columnById.get(key)?.name ?? t("issue.unknownStatus")
                    : memberById.get(key)?.name ?? t("issue.unassigned"),
            issues: groupedIssues,
        }));
    }, [columnById, filteredIssues, groupBy, memberById, t]);
    const orderedIssues = useMemo(() => groups.flatMap((group) => group.issues), [groups]);

    useEffect(() => {
        if (selectedIssueId && !orderedIssues.some((issue) => issue.id === selectedIssueId)) setSelectedIssueId(null);
    }, [orderedIssues, selectedIssueId]);

    useEffect(() => {
        if (!location.pathname.endsWith("/issues/list")) return;

        function handleListKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
            if (orderedIssues.length === 0) return;

            const currentIndex = orderedIssues.findIndex((issue) => issue.id === selectedIssueId);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const direction = event.key === "ArrowDown" ? 1 : -1;
                const nextIndex = currentIndex < 0 ? (direction === 1 ? 0 : orderedIssues.length - 1) : (currentIndex + direction + orderedIssues.length) % orderedIssues.length;
                const nextIssue = orderedIssues[nextIndex];
                setSelectedIssueId(nextIssue.id);
                document.querySelector<HTMLElement>(`[data-issue-id="${nextIssue.id}"]`)?.scrollIntoView({ block: "nearest" });
            }
            if (event.key === "Enter" && currentIndex >= 0) {
                event.preventDefault();
                openIssue(orderedIssues[currentIndex].identifier);
            }
            if (event.key === "Escape") setSelectedIssueId(null);
        }

        window.addEventListener("keydown", handleListKeyDown);
        return () => window.removeEventListener("keydown", handleListKeyDown);
    }, [location.pathname, orderedIssues, selectedIssueId]);

    function clearFilters() {
        setSearchParams(
            (current) => {
                for (const key of ["q", "priority", "status", "assignee", "label", "group"]) current.delete(key);
                return current;
            },
            { replace: true },
        );
    }


    function openIssue(identifier: string) {
        navigate(`/projects/${projectId}/issues/${identifier}`, { state: { backgroundLocation: location } });
    }

    function submitIssue() {
        if (!title.trim()) {
            setCreateError(t("validation.required"));
            return;
        }
        if (!columns?.[0]) {
            setCreateError(t("issue.createStatusFirst"));
            return;
        }
        setCreateError(null);
        createIssue.mutate(
            { columnId: columns[0].id, title: title.trim(), priority: "medium" },
            {
                onSuccess: (issue) => {
                    setTitle("");
                    setIsCreating(false);
                    openIssue(issue.identifier);
                },
                onError: (reason) => setCreateError(reason instanceof ApiError ? reason.message : t("errors.requestFailed")),
            },
        );
    }


    return (
        <div className="flex h-full min-h-0 flex-col bg-surface-1">
            <ProjectWorkspaceHeader projectId={projectId!} activeView="issues" />
            <IssueToolbar projectId={projectId!} onCreate={() => { setCreateError(null); setIsCreating(true); }} />
            <main className="min-h-0 w-full flex-1 overflow-y-auto">
                <div className="flex flex-col">
                    {isCreating && (
                        <div className="flex items-center gap-2 border-b border-subtle bg-surface-2 px-3 py-2">
                            <Input
                                autoFocus
                                value={title}
                                onChange={(value) => {
                                    setCreateError(null);
                                    setTitle(value);
                                }}
                                onKeyDown={(event) => event.key === "Enter" && submitIssue()}
                                placeholder={t("issue.issueTitle")}
                                size="sm"
                                className="min-w-0 flex-1"
                                aria-label={t("issue.issueTitle")}
                            />
                            <Button size="xs" isLoading={createIssue.isPending} onClick={submitIssue}>
                                {t("common.create")}
                            </Button>
                            <Button size="xs" color="tertiary" onClick={() => setIsCreating(false)}>
                                {t("common.cancel")}
                            </Button>
                            {createError && <p role="alert" className="text-xs text-danger-primary">{createError}</p>}
                        </div>
                    )}

                    {isLoading && <IssueListSkeleton />}
                    {isError && <ErrorMessage message={t("issue.couldNotLoadIssues")} />}
                    {!isLoading && !isError && (
                        <div className="overflow-hidden">
                            <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] gap-3 border-b border-subtle px-3 py-1.5 text-[11px] font-medium text-tertiary sm:grid lg:grid-cols-[minmax(0,1fr)_7rem_7rem_9rem_7rem_4rem]">
                                <span>{t("issue.title")}</span>
                                <span>{t("issue.status")}</span>
                                <span>{t("issue.priority")}</span>
                                <span>{t("issue.assignee")}</span>
                                <span className="hidden lg:block">{t("issue.label")}</span>
                                <span className="hidden text-right lg:block">{t("issue.estimate")}</span>
                            </div>
                            {groups.map((group) => (
                                <section key={group.key} aria-label={group.label ?? t("issue.allIssues")}>
                                    {group.label && (
                                        <h2 className="border-b border-subtle bg-surface-2">
                                            <button
                                                type="button"
                                                aria-expanded={!collapsedGroups.has(group.key)}
                                                onClick={() => setCollapsedGroups((current) => {
                                                    const next = new Set(current);
                                                    if (next.has(group.key)) next.delete(group.key);
                                                    else next.add(group.key);
                                                    return next;
                                                })}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium text-secondary hover:bg-layer-1-hover"
                                            >
                                                <ChevronDownOutline className={`size-3.5 text-placeholder transition-transform duration-200 ${collapsedGroups.has(group.key) ? "-rotate-90" : ""}`} aria-hidden="true" />
                                                <span>{group.label === "Unknown status" ? t("issue.unknownStatus") : translateStatusName(group.label, t)}</span>
                                                <span className="text-tertiary">{group.issues.length}</span>
                                            </button>
                                        </h2>
                                    )}
                                    {!collapsedGroups.has(group.key) && group.issues.map((issue) => (
                                        <IssueRow
                                            key={issue.id}
                                            issue={issue}
                                            projectId={projectId!}
                                            column={columnById.get(issue.columnId)}
                                            member={issue.assigneeId ? memberById.get(issue.assigneeId) : undefined}
                                            category={issue.categoryId ? categoryById.get(issue.categoryId) : undefined}
                                            backgroundLocation={location}
                                            selected={selectedIssueId === issue.id}
                                            onSelect={() => setSelectedIssueId(issue.id)}
                                        />
                                    ))}
                                </section>
                            ))}
                            {filteredIssues.length === 0 && (
                                <EmptyState
                                    title={issues?.length ? t("issue.noIssuesMatch") : t("issue.noIssues")}
                                    description={issues?.length ? t("issue.clearOrSearch") : t("issue.createFirstIssue")}
                                    action={
                                        issues?.length ? (
                                            <Button size="sm" color="secondary" onClick={clearFilters}>
                                                {t("issue.clearFilters")}
                                            </Button>
                                        ) : (
                                            <Button size="sm" iconLeading={AddOutline} onClick={() => setIsCreating(true)}>
                                                {t("issue.newIssue")}
                                            </Button>
                                        )
                                    }
                                />
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

function IssueListSkeleton() {
    const { t } = useTranslation();
    return <div className="overflow-hidden" aria-label={t("common.loading")} role="status">
        <div className="hidden h-9 border-b border-subtle bg-surface-2 sm:block" />
        <div className="divide-y divide-subtle">{["one", "two", "three", "four", "five"].map((key) => <div key={key} className="flex h-9 items-center gap-3 px-3">
            <Skeleton className="size-2 shrink-0 rounded-full" /><Skeleton className="h-3 w-16 shrink-0" /><Skeleton className="h-3 min-w-0 flex-1" /><Skeleton className="hidden h-6 w-16 sm:block" /><Skeleton className="hidden h-3 w-20 lg:block" />
        </div>)}</div>
    </div>;
}

function readOrder(value: string | null): OrderBy {
    return value === "number" || value === "priority" || value === "updated" ? value : "position";
}

function readGroup(value: string | null): GroupBy {
    return value === "status" || value === "assignee" ? value : "none";
}

function IssueRow({
    issue,
    projectId,
    column,
    member,
    category,
    backgroundLocation,
    selected,
    onSelect,
}: {
    issue: Issue;
    projectId: string;
    column?: { name: string; color: string | null };
    member?: { name: string; avatarUrl: string | null };
    category?: { name: string; color: string | null };
    backgroundLocation: Location;
    selected: boolean;
    onSelect: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div
            className="group/issue relative"
            data-issue-id={issue.id}
            data-issue-context="true"
            data-project-id={projectId}
            data-issue-identifier={issue.identifier}
            data-issue-title={issue.title}
        >
            <Link
                to={`/projects/${projectId}/issues/${issue.identifier}`}
                state={{ backgroundLocation }}
                tabIndex={0}
                onFocus={onSelect}
                className={`grid h-9 w-full grid-cols-[minmax(0,1fr)_8rem_8rem_10rem] items-center gap-3 border-b border-subtle px-3 text-left transition-colors duration-200 last:border-0 hover:bg-layer-1-hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-strong max-sm:h-auto max-sm:grid-cols-1 max-sm:gap-2 max-sm:py-2 max-sm:pr-12 lg:grid-cols-[minmax(0,1fr)_7rem_7rem_9rem_7rem_4rem] ${
                    selected ? "bg-accent-subtle" : ""
                }`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: column?.color ?? "#71717a" }} />
                    <span className="w-16 shrink-0 text-xs text-tertiary">{issue.identifier}</span>
                    <span className="min-w-0 truncate text-body-sm-medium text-primary">{issue.title}</span>
                    <span className="ml-auto hidden shrink-0 text-[11px] text-tertiary max-sm:block">{column ? translateStatusName(column.name, t) : ""}</span>
                </span>
                <span className="truncate text-xs text-secondary max-sm:hidden">{column ? translateStatusName(column.name, t) : t("issue.unknown")}</span>
                <span className="max-sm:hidden"><ImportanceBadge importance={issue.priority} /></span>
                <span className="flex min-w-0 items-center gap-2 text-xs text-tertiary max-sm:hidden">
                    {member ? <Avatar size="xs" src={member.avatarUrl ?? undefined} initials={initialsOf(member.name)} /> : <span className="size-6 shrink-0 rounded-full border border-dashed border-subtle" />}
                    <span className="truncate">{member?.name ?? t("issue.unassigned")}</span>
                </span>
                <span className="hidden truncate text-xs text-tertiary lg:block">{category?.name ?? "—"}</span>
                <span className="hidden text-right font-mono text-xs text-tertiary lg:block">{issue.estimate ?? "—"}</span>
                <span className="hidden truncate text-[11px] text-tertiary max-sm:block">
                    {[category?.name, `${t(`issue.${issue.priority}`)} · ${t("issue.priority")}`].filter(Boolean).join(" · ")}
                </span>
            </Link>
            <ContextMenuButton
                entity={{ type: "issue", projectId, identifier: issue.identifier, title: issue.title }}
                className="absolute top-1/2 right-1 -translate-y-1/2 bg-surface-1"
            />
        </div>
    );
}

function initialsOf(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
}
