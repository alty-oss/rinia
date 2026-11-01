import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Issue } from "@/features/issues/api";
import type { IssueView } from "@rinia/shared";
import { AddOutline, ChevronDownOutline } from "@makeplane/propel/icons";
import { Plus } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { urls } from "@/lib/urls";
import { cx } from "@/utils/cx";
import { useRouteProject } from "@/features/projects/route-project";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { Skeleton } from "@/components/base/feedback/skeleton";
import { Board } from "@/features/board/components/board";
import { StateIcon } from "@/features/board/components/issue-property-icons";
import { useColumns } from "@/features/board/hooks/use-board";
import { columnBucket, defaultIssueColumn } from "@/features/board/column-bucket";
import { IssueQuickCreateModal } from "@/features/issues/components/issue-quick-create-modal";
import { IssueListRow } from "@/features/issues/components/issue-list-row";
import { useCreateIssue, useIssues, useUpdateIssue } from "@/features/issues/hooks/use-issues";
import { ProjectWorkspaceHeader } from "@/features/projects/components/project-workspace-header";
import { IssueToolbar } from "@/features/issues/components/issue-toolbar";
import { useIssueView } from "@/features/issues/hooks/use-issue-view";
import { listGroupKey, useListReorder, type ListGroupBy } from "@/features/issues/hooks/use-list-reorder";
import { issueViews } from "@/features/issues/views";
import { useProjectMembers } from "@/features/projects/hooks/use-project-members";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { priorityLabelKey } from "@/features/issues/lib/priority";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "react-i18next";
import { translateStatusName } from "@/i18n/status-label";

type OrderBy = "position" | "priority" | "updated" | "number";
type GroupBy = ListGroupBy;
type Scope = "active" | "backlog" | "all";

export const ProjectIssuesPage = () => {
    const { t, i18n } = useTranslation();
    const { projectId, projectKey } = useRouteProject();
    const params = useParams<{ scope: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const orderBy = readOrder(searchParams.get("order"));
    const groupBy = readGroup(searchParams.get("group"));
    const search = searchParams.get("q") ?? "";
    const priority = searchParams.get("priority") ?? "";
    const status = searchParams.get("status") ?? "";
    const assignee = searchParams.get("assignee") ?? "";
    const category = searchParams.get("label") ?? "";
    const scope = readScope(params.scope ?? null);
    const { view, setView } = useIssueView(projectId!);
    const { data: issues, isLoading, isError } = useIssues(projectId!, { orderBy });
    const updateIssue = useUpdateIssue(projectId!);
    const { data: columns } = useColumns(projectId!);
    const { data: members } = useProjectMembers(projectId!);
    const { data: categories } = useCategories(projectId!);
    const createIssue = useCreateIssue(projectId!);
    const [isCreating, setIsCreating] = useState(false);
    const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const columnById = useMemo(() => new Map((columns ?? []).map((column) => [column.id, column])), [columns]);
    // The backlog scope only lists issues in a "Backlog" or "Fila" column; without one it would always be empty,
    // so its tab only shows when the project has such a column (or a link already opened it).
    const showBacklog = scope === "backlog" || (columns ?? []).some((column) => columnBucket(column.name) === "backlog");
    const memberById = useMemo(() => new Map((members ?? []).map((member) => [member.id, member])), [members]);
    const filteredIssues = useMemo(
        () =>
            (issues ?? []).filter((issue) => {
                const textMatch = !search || `${issue.identifier} ${issue.title}`.toLowerCase().includes(search.toLowerCase());
                const bucket = columnBucket(columnById.get(issue.columnId)?.name ?? "");
                const scopeMatch = scope === "all" || bucket === scope;
                return (
                    textMatch &&
                    scopeMatch &&
                    (!priority || issue.priority === priority) &&
                    (!status || issue.columnId === status) &&
                    (!assignee || issue.assigneeId === assignee) &&
                    (!category || issue.categoryId === category)
                );
            }),
        [assignee, category, columnById, issues, priority, scope, search, status],
    );
    // In manual order the list sorts by position itself, so a moved issue lands in place before the server answers.
    const manualOrder = orderBy === "position";
    const orderedSource = useMemo(
        () => (manualOrder ? [...filteredIssues].sort((left, right) => left.position - right.position || left.number - right.number) : filteredIssues),
        [filteredIssues, manualOrder],
    );
    const reorder = useListReorder({
        issues: orderedSource,
        groupBy,
        onMove: (issue, input, done) => updateIssue.mutate({ identifier: issue.identifier, input }, { onSettled: done }),
    });
    const listIssues = reorder.items;
    // Every identifier gets the width of the longest one, so titles line up without the ID column taking extra room.
    const identifierWidth = useMemo(() => Math.max(4, ...(issues ?? []).map((issue) => issue.identifier.length)), [issues]);

    const groups = useMemo(() => {
        if (groupBy === "none") return [{ key: "all", label: null, issues: listIssues }];

        const grouped = new Map<string, Issue[]>();
        for (const issue of listIssues) {
            const key = listGroupKey(issue, groupBy);
            grouped.set(key, [...(grouped.get(key) ?? []), issue]);
        }

        const ordered = [...grouped.entries()].sort((left, right) => {
            if (groupBy !== "status") return left[0].localeCompare(right[0]);
            const leftIndex = (columns ?? []).findIndex((column) => column.id === left[0]);
            const rightIndex = (columns ?? []).findIndex((column) => column.id === right[0]);
            return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
        });
        return ordered.map(([key, groupedIssues]) => ({
            key,
            label:
                groupBy === "status"
                    ? columnById.get(key)?.name ?? t("issue.unknownStatus")
                    : memberById.get(key)?.name ?? t("issue.unassigned"),
            issues: groupedIssues,
        }));
    }, [columnById, columns, listIssues, groupBy, memberById, t]);
    const orderedIssues = useMemo(() => groups.flatMap((group) => group.issues), [groups]);

    useEffect(() => {
        if (selectedIssueId && !orderedIssues.some((issue) => issue.id === selectedIssueId)) setSelectedIssueId(null);
    }, [orderedIssues, selectedIssueId]);

    useEffect(() => {
        if (view !== "list") return;

        function handleListKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
            if (orderedIssues.length === 0 || reorder.activeIssue) return;

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
    }, [orderedIssues, reorder.activeIssue, selectedIssueId, view]);

    function clearFilters() {
        setSearchParams(
            (current) => {
                for (const key of ["q", "priority", "status", "assignee", "label", "group"]) current.delete(key);
                return current;
            },
            { replace: true },
        );
    }


    /** Says what is empty: the filters and search that match nothing, or the scope and which states it covers. */
    function listEmptyState() {
        const list = new Intl.ListFormat(i18n.language, { type: "conjunction" });
        const statusName = (column: { name: string }) => translateStatusName(column.name, t);
        if (!issues?.length) {
            return {
                title: t("issue.noIssues"),
                description: t("issue.createFirstIssue"),
                action: <Button size="sm" iconLeading={AddOutline} onClick={() => startCreating(defaultIssueColumn(columns)?.id ?? null)}>{t("issue.newIssue")}</Button>,
            };
        }

        const statusColumn = status ? columnById.get(status) : undefined;
        const assigneeName = assignee ? memberById.get(assignee)?.name : undefined;
        const labelName = category ? categories?.find((item) => item.id === category)?.name : undefined;
        const conditions = ([
            priority && t("issue.conditionPriority", { value: t(priorityLabelKey(priority)) }),
            statusColumn && t("issue.conditionStatus", { value: statusName(statusColumn) }),
            assigneeName && t("issue.conditionAssignee", { value: assigneeName }),
            labelName && t("issue.conditionLabel", { value: labelName }),
            search && t("issue.conditionSearch", { value: search }),
        ] as Array<string | false | undefined>).filter((condition): condition is string => !!condition);
        if (conditions.length > 0) {
            const scopeLabel = scope === "backlog" ? t("issue.backlog") : t("issue.active");
            return {
                title: t("issue.noMatchingIssues"),
                description: scope === "all" ? t("issue.emptyFilteredAll", { conditions: list.format(conditions) }) : t("issue.emptyFiltered", { scope: scopeLabel, conditions: list.format(conditions) }),
                action: <Button size="sm" color="secondary" onClick={clearFilters}>{t("issue.clearFilters")}</Button>,
            };
        }

        const statesWhere = (match: (bucket: string) => boolean) => list.format((columns ?? []).filter((column) => match(columnBucket(column.name))).map(statusName));
        if (scope === "backlog") {
            const backlogColumn = columns?.find((column) => columnBucket(column.name) === "backlog");
            return {
                title: t("issue.emptyBacklogTitle"),
                description: t("issue.emptyBacklog", { states: statesWhere((bucket) => bucket === "backlog") }),
                action: <Button size="sm" iconLeading={AddOutline} onClick={() => startCreating(backlogColumn?.id ?? null)}>{t("issue.newIssue")}</Button>,
            };
        }
        return {
            title: t("issue.emptyActiveTitle"),
            description: t("issue.emptyActive", { states: statesWhere((bucket) => bucket !== "active") }),
            action: <Button size="sm" color="secondary" onClick={() => setScope("all")}>{t("issue.showAllIssues")}</Button>,
        };
    }

    function startCreating(columnId: string | null) {
        setCreateError(null);
        setCreatingColumnId(columnId);
        setIsCreating(true);
    }

    function openIssue(identifier: string) {
        navigate(urls.issue(identifier));
    }

    function submitIssue() {
        if (!title.trim()) {
            setCreateError(t("validation.required"));
            return;
        }
        const columnId = creatingColumnId ?? defaultIssueColumn(columns)?.id;
        if (!columnId) {
            setCreateError(t("issue.createStatusFirst"));
            return;
        }
        setCreateError(null);
        createIssue.mutate(
            { columnId, title: title.trim(), priority: "none" },
            {
                onSuccess: (issue) => {
                    setTitle("");
                    setIsCreating(false);
                    setCreatingColumnId(null);
                    openIssue(issue.identifier);
                },
                onError: (reason) => setCreateError(reason instanceof ApiError ? reason.message : t("errors.requestFailed")),
            },
        );
    }


    function setScope(next: Scope) {
        const query = searchParams.toString();
        navigate(`${urls.issues(projectKey, next)}${query ? `?${query}` : ""}`, { replace: true });
    }


    return (
        <div className="flex h-full min-h-0 flex-col bg-surface-1">
            <ProjectWorkspaceHeader
                projectId={projectId!}
                activeView="issues"
                actions={
                    <button
                        type="button"
                        className="flex h-7 items-center gap-1 rounded-md border border-subtle px-2 text-[13px] text-secondary hover:bg-layer-transparent-hover"
                        onClick={() => {
                            setCreateError(null);
                            setCreatingColumnId(defaultIssueColumn(columns)?.id ?? null);
                            setIsCreating(true);
                        }}
                    >
                        <Plus className="size-3.5" />
                        {t("issue.newIssue")}
                    </button>
                }
            />
            {/* The view switch leads the bar so neither view leaves its left side empty; every control in it is 28px tall. */}
            <div className="flex h-10 shrink-0 items-center gap-1 border-b border-subtle px-3">
                {view && (
                    <div className="animate-enter flex min-w-0 items-center gap-1">
                        <ViewSwitch view={view} onChange={setView} />
                        {view === "list" && (
                            <div key="scopes" className="animate-enter flex items-center gap-1">
                                <span aria-hidden="true" className="mx-1 h-4 w-px bg-border-secondary" />
                                {([
                                    ["active", t("issue.active")],
                                    ...(showBacklog ? [["backlog", t("issue.backlog")] as const] : []),
                                    ["all", t("issue.allIssues")],
                                ] as const).map(([value, label]) => (
                                    <button key={value} type="button" aria-pressed={scope === value} className={tab(scope === value)} onClick={() => setScope(value)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {view && (
                    <div className="animate-enter ml-auto flex items-center gap-1">
                        <IssueToolbar chrome layout={view} projectId={projectId!} onCreate={() => setIsCreating(true)} />
                    </div>
                )}
            </div>
            {/* Each view eases in when it opens, so switching (or a first-time preference arriving) never pops. */}
            {view === "board" && (
                <div key="board" className="animate-enter min-h-0 flex-1 overflow-x-auto bg-surface-2 px-4 pt-3 pb-3">
                    <Board projectId={projectId!} filters={searchParams} />
                    {isCreating && defaultIssueColumn(columns) && (
                        <IssueQuickCreateModal
                            projectId={projectId!}
                            columnId={creatingColumnId ?? defaultIssueColumn(columns)!.id}
                            onClose={() => { setIsCreating(false); setCreatingColumnId(null); }}
                            onCreated={(identifier) => {
                                setIsCreating(false);
                                setCreatingColumnId(null);
                                openIssue(identifier);
                            }}
                        />
                    )}
                </div>
            )}
            {view === "list" && (
            <main key="list" className="animate-enter min-h-0 w-full flex-1 overflow-y-auto">
                <div className="flex min-h-full flex-col">
                    {isCreating && !groups.some((group) => group.key === creatingColumnId) && (
                        <CreateRow
                            title={title}
                            pending={createIssue.isPending}
                            error={createError}
                            onChange={(value) => { setCreateError(null); setTitle(value); }}
                            onSubmit={submitIssue}
                            onCancel={() => { setIsCreating(false); setCreatingColumnId(null); }}
                        />
                    )}

                    {isLoading && <IssueListSkeleton />}
                    {isError && <ErrorMessage message={t("issue.couldNotLoadIssues")} />}
                    {!isLoading && !isError && (
                        <DndContext {...reorder.dndProps}>
                            {groups.map((group) => {
                                const column = columnById.get(group.key);
                                return (
                                <section key={group.key} aria-label={group.label ?? t("issue.allIssues")}>
                                    {group.label && (
                                        <h2 className="bg-layer-transparent-hover">
                                            <div className="flex h-9 items-center gap-2 px-3 text-[13px] text-secondary">
                                                <button
                                                    type="button"
                                                    aria-expanded={!collapsedGroups.has(group.key)}
                                                    onClick={() => setCollapsedGroups((current) => {
                                                        const next = new Set(current);
                                                        if (next.has(group.key)) next.delete(group.key);
                                                        else next.add(group.key);
                                                        return next;
                                                    })}
                                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                >
                                                    <ChevronDownOutline className={`size-3.5 text-placeholder transition-transform duration-200 ${collapsedGroups.has(group.key) ? "-rotate-90" : ""}`} aria-hidden="true" />
                                                    {groupBy === "status" && <StateIcon name={column?.name ?? group.label} color={column?.color} />}
                                                    <span>{group.label === "Unknown status" ? t("issue.unknownStatus") : translateStatusName(group.label, t)}</span>
                                                    <span className="text-tertiary">{group.issues.length}</span>
                                                </button>
                                                {groupBy === "status" && (
                                                    <button type="button" aria-label={t("issue.newIssue")} className="flex size-6 items-center justify-center rounded text-tertiary hover:bg-layer-1-hover hover:text-primary" onClick={() => { setCreateError(null); setTitle(""); setCreatingColumnId(group.key); setIsCreating(true); }}>
                                                        <Plus className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </h2>
                                    )}
                                    {isCreating && creatingColumnId === group.key && (
                                        <CreateRow
                                            title={title}
                                            pending={createIssue.isPending}
                                            error={createError}
                                            onChange={(value) => { setCreateError(null); setTitle(value); }}
                                            onSubmit={submitIssue}
                                            onCancel={() => { setIsCreating(false); setCreatingColumnId(null); }}
                                        />
                                    )}
                                    <SortableContext items={collapsedGroups.has(group.key) ? [] : group.issues.map((issue) => issue.id)} strategy={verticalListSortingStrategy}>
                                    {!collapsedGroups.has(group.key) && group.issues.map((issue) => (
                                        <IssueListRow
                                            key={issue.id}
                                            issue={issue}
                                            projectId={projectId!}
                                            identifierWidth={identifierWidth}
                                            sortable={manualOrder}
                                            column={columnById.get(issue.columnId)}
                                            columns={columns ?? []}
                                            member={issue.assigneeId ? memberById.get(issue.assigneeId) : undefined}
                                            members={members ?? []}
                                            selected={selectedIssueId === issue.id}
                                            onSelect={() => setSelectedIssueId(issue.id)}
                                            onUpdate={(input) => updateIssue.mutate({ identifier: issue.identifier, input })}
                                        />
                                    ))}
                                    </SortableContext>
                                </section>
                                );
                            })}
                            {filteredIssues.length === 0 && !(isCreating && !groups.some((group) => group.key === creatingColumnId)) && (
                                <EmptyState framed={false} className="flex-1 py-16" {...listEmptyState()} />
                            )}
                            <DragOverlay>
                                {reorder.activeIssue && (
                                    <div className="flex h-9 items-center gap-2 rounded-md border border-accent-strong bg-surface-1 px-2 text-[13px] shadow-overlay-200">
                                        <span className="size-5 shrink-0" />
                                        <span className="shrink-0 font-mono text-xs text-tertiary" style={{ width: `${identifierWidth}ch` }}>{reorder.activeIssue.identifier}</span>
                                        <span className="min-w-0 flex-1 truncate text-secondary">{reorder.activeIssue.title}</span>
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </main>
            )}
        </div>
    );
};

/** A tab in the issues bar: the view switch and the list's scopes share it, at the toolbar buttons' 28px. */
const tab = (active: boolean) =>
    cx("flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px]", active ? "bg-layer-1-selected text-primary" : "text-tertiary hover:bg-layer-transparent-hover hover:text-primary");

function ViewSwitch({ view, onChange }: { view: IssueView; onChange: (view: IssueView) => void }) {
    const { t } = useTranslation();
    return (
        <div role="group" aria-label={t("issue.view")} className="flex items-center gap-1">
            {issueViews.map(({ value, icon: Icon, label }) => (
                <button key={value} type="button" aria-pressed={view === value} className={tab(view === value)} onClick={() => onChange(value)}>
                    <Icon className="size-3.5" />
                    {t(label)}
                </button>
            ))}
        </div>
    );
}

function CreateRow({ title, pending, error, onChange, onSubmit, onCancel }: { title: string; pending: boolean; error: string | null; onChange: (value: string) => void; onSubmit: () => void; onCancel: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-2 px-3 py-2">
            <Input autoFocus value={title} onChange={onChange} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder={t("issue.issueTitle")} size="sm" className="min-w-0 flex-1" aria-label={t("issue.issueTitle")} />
            <Button size="xs" isLoading={pending} onClick={onSubmit}>{t("common.create")}</Button>
            <Button size="xs" color="tertiary" onClick={onCancel}>{t("common.cancel")}</Button>
            {error && <p role="alert" className="text-xs text-danger-primary">{error}</p>}
        </div>
    );
}

function IssueListSkeleton() {
    const { t } = useTranslation();
    return <div className="overflow-hidden" aria-label={t("common.loading")} role="status">
        <div className="hidden h-9 border-b border-subtle bg-surface-2 sm:block" />
        <div className="divide-y divide-subtle">{["one", "two", "three", "four", "five"].map((key) => <div key={key} className="flex h-11 items-center gap-4 px-4">
            <Skeleton className="h-3 w-24 shrink-0" /><Skeleton className="h-3 min-w-0 flex-1" /><Skeleton className="hidden h-3 w-24 sm:block" /><Skeleton className="hidden size-2 rounded-full sm:block" />
        </div>)}</div>
    </div>;
}

function readOrder(value: string | null): OrderBy {
    return value === "number" || value === "priority" || value === "updated" ? value : "position";
}

function readGroup(value: string | null): GroupBy {
    if (value === "none" || value === "assignee") return value;
    return "status";
}

function readScope(value: string | null): Scope {
    return value === "backlog" || value === "all" ? value : "active";
}

