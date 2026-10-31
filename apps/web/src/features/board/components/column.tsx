import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AddOutline, ArrowCollapseOutline, ArrowExpandOutline, DeleteOutline } from "@makeplane/propel/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { ConfirmDialog } from "@/components/overlay/confirm-dialog";
import type { Issue, IssuePerson } from "@/features/issues/api";
import { ApiError } from "@/lib/api-client";
import { cx } from "@/utils/cx";
import type { BoardColumn } from "../api";
import { useDeleteColumn, useUpdateColumn } from "../hooks/use-board";
import { StateIcon } from "./issue-property-icons";
import { IssueCard } from "./issue-card";
import { useTranslation } from "react-i18next";
import { translateStatusName } from "@/i18n/status-label";

interface ColumnProps {
    column: BoardColumn;
    issues: Issue[];
    projectId: string;
    categoriesById: Map<string, { name: string; color: string | null }>;
    membersById: Map<string, IssuePerson>;
    onOpenIssue: (identifier: string) => void;
    onCreateIssue: (columnId: string) => void;
}

export const Column = ({ column, issues, projectId, categoriesById, membersById, onOpenIssue, onCreateIssue }: ColumnProps) => {
    const { t } = useTranslation();
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });

    const updateColumn = useUpdateColumn(projectId);
    const deleteColumn = useDeleteColumn(projectId);

    const [collapsed, setCollapsed] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState(column.name);
    const [error, setError] = useState<string | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const label = translateStatusName(column.name, t);

    useEffect(() => {
        if (isEditingName) {
            nameInputRef.current?.select();
        }
    }, [isEditingName]);

    function startEditing() {
        setName(column.name);
        setIsEditingName(true);
    }

    function saveName() {
        setIsEditingName(false);
        const trimmed = name.trim();
        if (!trimmed || trimmed === column.name) {
            setName(column.name);
            return;
        }
        updateColumn.mutate({ columnId: column.id, input: { name: trimmed } }, {
            onError: (err) => setError(err instanceof ApiError ? err.message : t("errors.requestFailed")),
        });
    }

    function handleDelete() {
        setError(null);
        deleteColumn.mutate(column.id, {
            onError: (err) => setError(err instanceof ApiError ? err.message : t("errors.requestFailed")),
        });
    }

    return (
        <div
            data-board-column={column.id}
            className={cx("group/column flex h-full max-h-full shrink-0 flex-col overflow-hidden rounded-md bg-layer-1 transition-[width] duration-200 ease-out", collapsed ? "w-11" : "w-[350px]")}
        >
            <div className="h-0.5 shrink-0" style={{ backgroundColor: column.color ?? "var(--border-subtle)" }} />
            <div className="sticky top-0 z-[2] flex h-8 shrink-0 items-center gap-2 bg-surface-2 px-1.5 py-1">
                {isEditingName ? (
                    <Input
                        size="sm"
                        aria-label={t("settings.stateName")}
                        value={name}
                        onChange={setName}
                        onBlur={saveName}
                        autoFocus
                        ref={nameInputRef}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") saveName();
                            if (event.key === "Escape") {
                                setName(column.name);
                                setIsEditingName(false);
                            }
                        }}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={startEditing}
                        className="flex min-w-0 items-center gap-2 rounded px-0.5 text-left font-medium text-primary hover:bg-layer-1-hover"
                    >
                        <span className="grid size-5 shrink-0 place-items-center rounded-xs">
                            <StateIcon name={column.name} color={column.color} className="size-3.5" />
                        </span>
                        {!collapsed && <span className="truncate">{label}</span>}
                    </button>
                )}

                {!collapsed && <span className="text-13 text-tertiary">{issues.length}</span>}
                <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/column:opacity-100 group-focus-within/column:opacity-100">
                    <ButtonUtility icon={collapsed ? ArrowExpandOutline : ArrowCollapseOutline} size="xs" color="tertiary" tooltip={`${collapsed ? t("nav.expand") : t("nav.collapse")} ${label}`} onClick={() => setCollapsed(!collapsed)} />
                    {!collapsed && <ButtonUtility icon={AddOutline} size="xs" color="tertiary" tooltip={`${t("issue.newIssue")} · ${label}`} onClick={() => onCreateIssue(column.id)} />}
                    <ConfirmDialog
                        trigger={<ButtonUtility icon={DeleteOutline} size="xs" color="tertiary" tooltip={t("settings.deleteState")} />}
                        title={t("settings.deleteState")}
                        description={t("settings.deleteStateDescription", { name: label })}
                        confirmLabel={t("settings.deleteState")}
                        isPending={deleteColumn.isPending}
                        onConfirm={handleDelete}
                    />
                </div>
            </div>

            {error && <p className="px-3 pb-2 text-xs text-danger-primary">{error}</p>}

            <div ref={setDropRef} className={cx("min-h-0 flex-1 overflow-y-auto rounded-sm p-1", collapsed && "hidden", isOver && "bg-accent-subtle/50")}>
                <SortableContext items={issues.map((issue) => issue.id)} strategy={verticalListSortingStrategy}>
                    {issues.map((issue) => (
                        <IssueCard
                            key={issue.id}
                            issue={issue}
                            projectId={projectId}
                            category={issue.categoryId ? categoriesById.get(issue.categoryId) : undefined}
                            assignee={issue.assigneeId ? membersById.get(issue.assigneeId) : undefined}
                            onClick={() => onOpenIssue(issue.identifier)}
                        />
                    ))}
                </SortableContext>
                <Button color="tertiary" size="sm" iconLeading={AddOutline} onClick={() => onCreateIssue(column.id)} className="mt-0.5 w-full justify-start px-2 text-secondary">
                    {t("issue.newIssue")}
                </Button>
            </div>
        </div>
    );
};
