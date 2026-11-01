import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Link } from "react-router";
import { urls } from "@/lib/urls";
import type { UpdateIssueInput } from "@rinia/shared";
import type { Issue } from "@/features/issues/api";
import { columnBucket } from "@/features/board/column-bucket";
import { DueDateMenu } from "@/features/issues/components/due-date-picker";
import { AssigneeMenu, PriorityMenu, StatusMenu, propertyIcon } from "@/features/issues/components/issue-property-menus";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";

export function IssueListRow({
    issue,
    projectId,
    column,
    columns,
    member,
    members,
    identifierWidth,
    sortable,
    selected,
    onSelect,
    onUpdate,
}: {
    issue: Issue;
    projectId: string;
    column?: { id: string; name: string; color: string | null };
    columns: Array<{ id: string; name: string; color: string | null }>;
    member?: { id: string; name: string; avatarUrl: string | null };
    members: Array<{ id: string; name: string; avatarUrl: string | null }>;
    /** Width of the identifier column in characters: the longest identifier in the list, so every title starts at the same x. */
    identifierWidth: number;
    /** Whether the grip drags the row. Only the manual order can be rearranged; other orders hide the grip. */
    sortable: boolean;
    selected: boolean;
    onSelect: () => void;
    onUpdate: (input: UpdateIssueInput) => void;
}) {
    const { t, i18n } = useTranslation();
    const date = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(new Date(issue.createdAt));
    const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id, disabled: !sortable });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cx("group/issue relative flex h-9 items-center gap-2 bg-surface-1 px-2 text-[13px] hover:bg-layer-transparent-hover", selected && "bg-layer-1-selected", isDragging && "z-10 opacity-40")}
            data-issue-id={issue.id}
            data-issue-context="true"
            data-project-id={projectId}
            data-issue-identifier={issue.identifier}
            data-issue-title={issue.title}
        >
            {sortable ? (
                <button
                    ref={setActivatorNodeRef}
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={t("issue.dragToReorder")}
                    className="flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-placeholder opacity-0 group-hover/issue:opacity-100 hover:bg-layer-1-hover focus-visible:opacity-100 active:cursor-grabbing"
                >
                    <GripVertical className={propertyIcon} />
                </button>
            ) : (
                <span aria-hidden="true" className="size-5 shrink-0" />
            )}
            <Link
                to={urls.issue(issue.identifier, issue.title)}
                onFocus={onSelect}
                className="shrink-0 truncate font-mono text-xs text-tertiary"
                style={{ width: `${identifierWidth}ch` }}
            >
                {issue.identifier}
            </Link>
            <StatusMenu value={column} statuses={columns} onChange={(columnId) => onUpdate({ columnId })} />
            <Link
                to={urls.issue(issue.identifier, issue.title)}
                className="min-w-0 flex-1 truncate text-secondary"
            >
                {issue.title}
            </Link>
            {issue.dueDate && <DueDateMenu value={issue.dueDate} closed={columnBucket(column?.name ?? "") === "closed"} onChange={(dueDate) => onUpdate({ dueDate })} />}
            <PriorityMenu value={issue.priority} onChange={(priority) => onUpdate({ priority })} className="opacity-0 group-hover/issue:opacity-100 focus-visible:opacity-100" />
            <AssigneeMenu value={member} people={members} onChange={(assigneeId) => onUpdate({ assigneeId })} />
            <span className="w-14 shrink-0 text-right text-xs text-tertiary">{date}</span>
        </div>
    );
}
