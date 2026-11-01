import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocation } from "react-router";
import type { UpdateIssueInput } from "@rinia/shared";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import type { Issue, IssuePerson } from "@/features/issues/api";
import { DueDateMenu } from "@/features/issues/components/due-date-picker";
import { AssigneeMenu, EstimateMenu, LabelMenu, PriorityMenu } from "@/features/issues/components/issue-property-menus";
import { cx } from "@/utils/cx";

interface IssueCardContentProps {
    issue: Issue;
    category?: { name: string; color: string | null };
    assignee?: IssuePerson;
    /** Choices for the property menus. The drag overlay leaves them out: its copy of the card is never clicked. */
    people?: IssuePerson[];
    labels?: Array<{ id: string; name: string; color: string | null }>;
    onUpdate?: (input: UpdateIssueInput) => void;
    /** Whether the issue sits in a closed state, where a past due date is no longer late. */
    closed?: boolean;
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

// Unset estimate and label icons only show while the card is hovered or focused, or their menu is open.
const revealOnHover = "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-popup-open:opacity-100";

/**
 * Shared with the drag overlay so picking up an issue preserves its geometry. The column already names the
 * status, so the card does not repeat it; each property is a 16px icon that opens a menu to change it.
 */
export const IssueCardContent = ({ issue, category, assignee, people = [], labels = [], onUpdate = () => {}, closed = false }: IssueCardContentProps) => {
    const imagePreview = firstIssueImage(issue.descriptionJson);
    const estimate = <EstimateMenu key="estimate" value={issue.estimate} onChange={(next) => onUpdate({ estimate: next })} className={issue.estimate == null ? revealOnHover : undefined} />;
    const label = <LabelMenu key="label" value={category && issue.categoryId ? { id: issue.categoryId, ...category } : undefined} labels={labels} onChange={(categoryId) => onUpdate({ categoryId })} className={category ? "min-w-0" : revealOnHover} />;
    const due = <DueDateMenu key="due" value={issue.dueDate} closed={closed} onChange={(dueDate) => onUpdate({ dueDate })} className={issue.dueDate ? undefined : revealOnHover} />;
    // Set properties come first so the hidden, unset ones never leave a gap between visible icons.
    const optional = [issue.dueDate && due, issue.estimate != null && estimate, category && label, !issue.dueDate && due, issue.estimate == null && estimate, !category && label];
    return <>
        {imagePreview && <IssuePreviewImage key={imagePreview} src={imagePreview} />}
        <span className="block text-[11px] font-medium tracking-wide text-tertiary">{issue.identifier}</span>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 font-medium text-primary" title={issue.title}>{issue.title}</p>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1 text-tertiary">
            <PriorityMenu value={issue.priority} onChange={(priority) => onUpdate({ priority })} />
            <AssigneeMenu value={assignee} people={people} onChange={(assigneeId) => onUpdate({ assigneeId })} />
            {optional}
        </div>
    </>;
};

interface IssueCardProps extends IssueCardContentProps {
    projectId: string;
    onClick: () => void;
}

export const IssueCard = ({ issue, category, assignee, people, labels, onUpdate, closed, projectId, onClick }: IssueCardProps) => {
    const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

    const location = useLocation();
    const selected = location.pathname.endsWith(`/issues/${issue.identifier}`);
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-issue-id={issue.id}
            className={cx("group/card relative", isDragging && "z-10 opacity-40")}
        >
            {/* A div rather than a button: the property menus inside it are buttons themselves. */}
            <div
                ref={setActivatorNodeRef}
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
                <IssueCardContent issue={issue} category={category} assignee={assignee} people={people} labels={labels} onUpdate={onUpdate} closed={closed} />
            </div>
            <ContextMenuButton
                entity={{ type: "issue", projectId, identifier: issue.identifier, title: issue.title }}
                className="absolute top-1.5 right-1.5 z-10 rounded-md bg-layer-2"
            />
        </div>
    );
};
