import { GripVertical } from "lucide-react";
import { Link } from "react-router";
import { urls } from "@/lib/urls";
import type { UpdateIssueInput } from "@rinia/shared";
import type { Issue } from "@/features/issues/api";
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
    selected: boolean;
    onSelect: () => void;
    onUpdate: (input: UpdateIssueInput) => void;
}) {
    const { t, i18n } = useTranslation();
    const date = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(new Date(issue.createdAt));
    return (
        <div
            className={cx("group/issue flex h-9 items-center gap-2 px-2 text-[13px] hover:bg-layer-transparent-hover", selected && "bg-layer-1-selected")}
            data-issue-id={issue.id}
            data-issue-context="true"
            data-project-id={projectId}
            data-issue-identifier={issue.identifier}
            data-issue-title={issue.title}
        >
            <button type="button" aria-pressed={selected} aria-label={t("issue.selected")} onClick={onSelect} className="flex size-5 shrink-0 items-center justify-center text-placeholder opacity-0 group-hover/issue:opacity-100">
                <GripVertical className={propertyIcon} />
            </button>
            <Link
                to={urls.issue(issue.identifier, issue.title)}
                onFocus={onSelect}
                className="flex min-w-0 flex-1 items-center gap-2"
            >
                <span className="w-24 shrink-0 truncate font-mono text-xs text-tertiary">{issue.identifier}</span>
            </Link>
            <StatusMenu value={column} statuses={columns} onChange={(columnId) => onUpdate({ columnId })} />
            <Link
                to={urls.issue(issue.identifier, issue.title)}
                className="min-w-0 flex-1 truncate text-secondary"
            >
                {issue.title}
            </Link>
            <PriorityMenu value={issue.priority} onChange={(priority) => onUpdate({ priority })} className="opacity-0 group-hover/issue:opacity-100 focus-visible:opacity-100" />
            <AssigneeMenu value={member} people={members} onChange={(assigneeId) => onUpdate({ assigneeId })} />
            <span className="w-14 shrink-0 text-right text-xs text-tertiary">{date}</span>
        </div>
    );
}
