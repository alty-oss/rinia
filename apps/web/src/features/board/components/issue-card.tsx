import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocation } from "react-router";
import { AssigneeOutline, EstimateOutline } from "@makeplane/propel/icons";
import { ContextMenuButton } from "@/components/overlay/context-menu-provider";
import type { Issue, IssuePerson } from "@/features/issues/api";
import { cx } from "@/utils/cx";
import { IssueAvatar, PriorityIcon } from "./issue-property-icons";
import { useTranslation } from "react-i18next";

interface IssueCardContentProps {
    issue: Issue;
    category?: { name: string; color: string | null };
    assignee?: IssuePerson;
}

const chip = "inline-flex h-5 max-w-full items-center gap-1 rounded-sm border border-subtle px-1 text-[11px] text-secondary";

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
export const IssueCardContent = ({ issue, category, assignee }: IssueCardContentProps) => {
    const { t } = useTranslation();
    const imagePreview = firstIssueImage(issue.descriptionJson);
    return <>
        {imagePreview && <IssuePreviewImage key={imagePreview} src={imagePreview} />}
        <span className="block text-xs text-tertiary">{issue.identifier}</span>
        <p className="mt-1 truncate text-body-sm-medium text-primary" title={issue.title}>{issue.title}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1.5 text-tertiary">
            <PriorityIcon priority={issue.priority} withContainer />
            {assignee ? <IssueAvatar name={assignee.name} avatarUrl={assignee.avatarUrl} /> : <span className={chip} title={t("issue.unassigned")}><AssigneeOutline className="size-3" /></span>}
            {issue.estimate != null && <span className={chip} title={t("projects.points", { count: issue.estimate })}><EstimateOutline className="size-3" />{issue.estimate}</span>}
            {category && <span className={chip}><span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: category.color ?? "#7a5af8" }} />{category.name}</span>}
        </div>
    </>;
};

interface IssueCardProps extends IssueCardContentProps {
    projectId: string;
    onClick: () => void;
}

export const IssueCard = ({ issue, category, assignee, projectId, onClick }: IssueCardProps) => {
    const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

    const location = useLocation();
    const selected = location.pathname.endsWith(`/issues/${issue.identifier}`);
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-issue-id={issue.id}
            className={cx("relative mb-2", isDragging && "z-10 opacity-40")}
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
                    "block w-full cursor-pointer touch-none rounded-lg border border-subtle bg-layer-2 p-3 pr-9 text-left text-13 shadow-raised-100 outline-none transition-all duration-200 ease-out hover:border-strong hover:shadow-raised-200 focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-1 md:pr-3",
                    selected && "border-accent-strong",
                )}
            >
                <IssueCardContent issue={issue} category={category} assignee={assignee} />
            </button>
            <ContextMenuButton
                entity={{ type: "issue", projectId, identifier: issue.identifier, title: issue.title }}
                className="absolute top-1.5 right-1.5 z-10 rounded-md bg-layer-2"
            />
        </div>
    );
};
