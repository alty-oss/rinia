import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/features/issues/api";
import { AddOutline, ChevronDownOutline } from "@makeplane/propel/icons";
import { Plus } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorMessage } from "@/components/feedback/error-message";
import { Skeleton } from "@/components/base/feedback/skeleton";
import { StateIcon } from "@/features/board/components/issue-property-icons";
import { useColumns } from "@/features/board/hooks/use-board";
import { IssueListRow } from "@/features/issues/components/issue-list-row";
import { useCreateIssue, useIssues, useUpdateIssue } from "@/features/issues/hooks/use-issues";
import { ProjectWorkspaceHeader } from "@/features/projects/components/project-workspace-header";
import { IssueToolbar } from "@/features/issues/components/issue-toolbar";
import { useProjectMembers } from "@/features/projects/hooks/use-project-members";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "react-i18next";
import { translateStatusName } from "@/i18n/status-label";

type OrderBy = "position" | "priority" | "updated" | "number";
type GroupBy = "none" | "status" | "assignee";
type Scope = "active" | "backlog" | "all";

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
    const scope = readScope(searchParams.get("scope"));
    const { data: issues, isLoading, isError } = useIssues(projectId!, { orderBy });
    const updateIssue = useUpdateIssue(projectId!);
    const { data: columns } = useColumns(projectId!);
    const { data: members } = useProjectMembers(projectId!);
    const createIssue = useCreateIssue(projectId!);
    const [isCreating, setIsCreating] = useState(false);
    const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const columnById = useMemo(() => new Map((columns ?? []).map((column) => [column.id, column])), [columns]);
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

    const groups = useMemo(() => {
        if (groupBy === "none") return [{ key: "all", label: null, issues: filteredIssues }];

        const grouped = new Map<string, Issue[]>();
        for (const issue of filteredIssues) {
            const key = groupBy === "status" ? issue.columnId : issue.assigneeId ?? "unassigned";
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
    }, [columnById, columns, filteredIssues, groupBy, memberById, t]);
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
        const columnId = creatingColumnId ?? columns?.[0]?.id;
        if (!columnId) {
            setCreateError(t("issue.createStatusFirst"));
            return;
        }
        setCreateError(null);
        createIssue.mutate(
            { columnId, title: title.trim(), priority: "medium" },
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
        setSearchParams((current) => {
            if (next === "active") current.delete("scope");
            else current.set("scope", next);
            return current;
        }, { replace: true });
    }

    const pill = "flex h-6 items-center rounded-md px-2 text-[13px] text-tertiary hover:bg-layer-transparent-hover hover:text-primary";
    const pillOn = "bg-layer-1-selected text-primary";

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
                            setCreatingColumnId(columns?.[0]?.id ?? null);
                            setIsCreating(true);
                        }}
                    >
                        <Plus className="size-3.5" />
                        {t("issue.newIssue")}
                    </button>
                }
            />
            <div className="flex h-10 shrink-0 items-center gap-1 border-b border-subtle px-3">
                {([
                    ["active", t("issue.active")],
                    ["backlog", t("issue.backlog")],
                    ["all", t("issue.allIssues")],
                ] as const).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={scope === value} className={`${pill} ${scope === value ? pillOn : ""}`} onClick={() => setScope(value)}>
                        {label}
                    </button>
                ))}
                <div className="ml-auto">
                    <IssueToolbar chrome projectId={projectId!} onCreate={() => setIsCreating(true)} />
                </div>
            </div>
            <main className="min-h-0 w-full flex-1 overflow-y-auto">
                <div className="flex flex-col">
                    {isCreating && !creatingColumnId && (
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
                        <div>
                            {groups.map((group) => {
                                const column = columnById.get(group.key);
                                return (
                                <section key={group.key} aria-label={group.label ?? t("issue.allIssues")}>
                                    {group.label && (
                                        <h2 className="bg-layer-1">
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
                                    {!collapsedGroups.has(group.key) && group.issues.map((issue) => (
                                        <IssueListRow
                                            key={issue.id}
                                            issue={issue}
                                            projectId={projectId!}
                                            column={columnById.get(issue.columnId)}
                                            columns={columns ?? []}
                                            member={issue.assigneeId ? memberById.get(issue.assigneeId) : undefined}
                                            members={members ?? []}
                                            backgroundLocation={location}
                                            selected={selectedIssueId === issue.id}
                                            onSelect={() => setSelectedIssueId(issue.id)}
                                            onUpdate={(input) => updateIssue.mutate({ identifier: issue.identifier, input })}
                                        />
                                    ))}
                                </section>
                                );
                            })}
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
                                            <Button size="sm" iconLeading={AddOutline} onClick={() => { setCreatingColumnId(columns?.[0]?.id ?? null); setIsCreating(true); }}>
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

function columnBucket(name: string): "active" | "backlog" | "closed" {
    const normalized = name.toLowerCase();
    if (normalized.includes("backlog") || normalized.includes("fila")) return "backlog";
    if (normalized.includes("done") || normalized.includes("cancel") || normalized.includes("duplicate") || normalized.includes("conclu")) return "closed";
    return "active";
}
