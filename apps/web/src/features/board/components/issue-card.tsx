import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocation } from "react-router";
import { AssigneeOutline, EstimateOutline } from "@makeplane/propel/icons";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import type { Issue, IssuePerson } from "@/features/issues/api";
import { translateStatusName } from "@/i18n/status-label";
import { cx } from "@/utils/cx";
import { IssueAvatar, PriorityIcon, StateIcon } from "./issue-property-icons";
import { useTranslation } from "react-i18next";

interface IssueCardContentProps {
    issue: Issue;
    column: { name: string; color?: string | null };
    category?: { name: string; color: string | null };
    assignee?: IssuePerson;
}

function firstIssueImage(document: Issue["descriptionJson"]): string | null {
    const visit = (nodes: unknown[]): string | null => {
        for (const candidate of nodes) {
            if (!candidate || typeof candidate !== "object") continue;
            const node = candidate as { type?: unknown; attrs?: { src?: unknown }; content?: unknown[] };
            if (node.type === "image" && typeof node.attrs?.src === "string") {
                try {
                    const url = new URL(node.attrs.src);
                    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
                } catch { /* Ignore malformed legacy image nodes. */ }
            }
            if (Array.isArray(node.content)) {
                const nested = visit(node.content);
                if (nested) return nested;
            }
        }
        return null;
    };
    return visit(document.content ?? []);
}

function IssuePreviewImage({ src }: { src: string }) {
    const [failed, setFailed] = useState(false);
    if (failed) return null;
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="mb-2 block h-24 w-full rounded object-cover" />;
}

/** Shared with the drag overlay so picking up an issue preserves its geometry. */
export const IssueCardContent = ({ issue, column, category, assignee }: IssueCardContentProps) => {
    const { t } = useTranslation();
    const imagePreview = firstIssueImage(issue.descriptionJson);
    return <>
        {imagePreview && <IssuePreviewImage key={imagePreview} src={imagePreview} />}
        <span className="block text-[11px] font-medium tracking-wide text-tertiary">{issue.identifier}</span>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 font-medium text-primary" title={issue.title}>{issue.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-tertiary">
            {column && (
                <span className="inline-flex h-[22px] max-w-full items-center gap-1 rounded-md border border-subtle px-1.5 text-[11px] text-secondary">
                    <StateIcon name={column.name} color={column.color} className="size-3.5" />
                    <span className="truncate">{translateStatusName(column.name, t)}</span>
                </span>
            )}
            <PriorityIcon priority={issue.priority} />
            {assignee ? <IssueAvatar name={assignee.name} avatarUrl={assignee.avatarUrl} className="size-4 text-[9px]" /> : <span title={t("issue.unassigned")} className="inline-flex size-4 items-center justify-center rounded-full border border-subtle text-placeholder"><AssigneeOutline className="size-3" /></span>}
            {issue.estimate != null && <span title={t("projects.points", { count: issue.estimate })} className="inline-flex items-center gap-0.5 text-[11px] text-secondary"><EstimateOutline className="size-3.5" />{issue.estimate}</span>}
        </div>
        {category && (
            <span className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[11px] text-secondary">
                <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: category.color ?? "#7a5af8" }} />
                <span className="truncate">{category.name}</span>
            </span>
        )}
    </>;
};

interface IssueCardProps extends IssueCardContentProps {
    projectId: string;
    onClick: () => void;
}

export const IssueCard = ({ issue, column, category, assignee, projectId, onClick }: IssueCardProps) => {
    const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

    const location = useLocation();
    const selected = location.pathname.endsWith(`/issues/${issue.identifier}`);
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-issue-id={issue.id}
            className={cx("relative", isDragging && "z-10 opacity-40")}
        >
            <button
                ref={setActivatorNodeRef}
                type="button"
                {...attributes}
                {...listeners}
                data-issue-context="true"
                data-project-id={projectId}
                data-issue-identifier={issue.identifier}
                data-issue-title={issue.title}
                data-peek-selected={selected || undefined}
                onClick={onClick}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        onClick();
                    } else listeners?.onKeyDown?.(event);
                }}
                className={cx(
                    "block w-full cursor-pointer touch-none rounded-md border border-subtle bg-surface-1 px-3 py-2.5 pr-9 text-left outline-none transition-colors duration-200 ease-out hover:border-strong focus-visible:ring-2 focus-visible:ring-accent-strong md:pr-3",
                    selected && "border-accent-strong",
                )}
            >
                <IssueCardContent issue={issue} column={column} category={category} assignee={assignee} />
            </button>
            <ContextMenuButton
                entity={{ type: "issue", projectId, identifier: issue.identifier, title: issue.title }}
                className="absolute top-1.5 right-1.5 z-10 rounded-md bg-layer-2"
            />
        </div>
    );
};
