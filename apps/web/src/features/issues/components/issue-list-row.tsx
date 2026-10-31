import type { ReactElement, ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { GripVertical } from "lucide-react";
import { Link } from "react-router";
import type { Location } from "react-router";
import type { UpdateIssueInput } from "@rinia/shared";
import { Avatar } from "@/components/base/avatar/avatar";
import { overlayChrome } from "@/components/overlay/overlay-chrome";
import { IssueAvatar, PriorityIcon, StateIcon } from "@/features/board/components/issue-property-icons";
import type { Issue } from "@/features/issues/api";
import { translateStatusName } from "@/i18n/status-label";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";

const menuItem = "flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-[13px] text-secondary outline-none data-highlighted:bg-layer-2-hover";

export function IssueListRow({
    issue,
    projectId,
    column,
    columns,
    member,
    members,
    selected,
    backgroundLocation,
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
    backgroundLocation: Location;
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
            <button type="button" aria-pressed={selected} aria-label={t("issue.selected")} onClick={onSelect} className="flex size-4 shrink-0 items-center justify-center text-placeholder opacity-0 group-hover/issue:opacity-100">
                <GripVertical className="size-3.5" />
            </button>
            <Link
                to={`/projects/${projectId}/issues/${issue.identifier}`}
                state={{ backgroundLocation }}
                onFocus={onSelect}
                className="flex min-w-0 flex-1 items-center gap-2"
            >
                <span className="w-24 shrink-0 truncate font-mono text-xs text-tertiary">{issue.identifier}</span>
            </Link>
            <RowMenu label={t("issue.status")}>
                <button type="button" className="flex size-5 items-center justify-center rounded text-tertiary hover:bg-layer-1-hover" aria-label={t("issue.status")}>
                    <StateIcon name={column?.name ?? ""} color={column?.color} />
                </button>
                {columns.map((item, index) => (
                    <Menu.Item key={item.id} className={menuItem} onClick={() => onUpdate({ columnId: item.id })}>
                        <StateIcon name={item.name} color={item.color} />
                        <span className="flex-1 truncate">{translateStatusName(item.name, t)}</span>
                        <span className="text-[11px] text-placeholder">{index + 1}</span>
                    </Menu.Item>
                ))}
            </RowMenu>
            <Link
                to={`/projects/${projectId}/issues/${issue.identifier}`}
                state={{ backgroundLocation }}
                className="min-w-0 flex-1 truncate text-secondary"
            >
                {issue.title}
            </Link>
            <RowMenu label={t("issue.priority")} className="opacity-0 group-hover/issue:opacity-100">
                <button type="button" className="flex size-5 items-center justify-center rounded hover:bg-layer-1-hover" aria-label={t("issue.priority")}>
                    <PriorityIcon priority={issue.priority} />
                </button>
                {(["high", "medium", "low"] as const).map((priority, index) => (
                    <Menu.Item key={priority} className={menuItem} onClick={() => onUpdate({ priority })}>
                        <PriorityIcon priority={priority} />
                        <span className="flex-1">{t(`issue.${priority}`)}</span>
                        <span className="text-[11px] text-placeholder">{index + 1}</span>
                    </Menu.Item>
                ))}
            </RowMenu>
            <RowMenu label={t("issue.assignee")}>
                <button type="button" className="flex size-5 items-center justify-center" aria-label={member?.name ?? t("issue.unassigned")}>
                    {member ? <Avatar size="xs" src={member.avatarUrl ?? undefined} initials={initialsOf(member.name)} /> : <span className="size-4 rounded-full border border-dashed border-strong" />}
                </button>
                <Menu.Item className={menuItem} onClick={() => onUpdate({ assigneeId: null })}>
                    <span className="size-4 rounded-full border border-dashed border-strong" />
                    <span className="flex-1">{t("issue.unassigned")}</span>
                </Menu.Item>
                {members.map((person, index) => (
                    <Menu.Item key={person.id} className={menuItem} onClick={() => onUpdate({ assigneeId: person.id })}>
                        {person.avatarUrl ? <Avatar size="xs" src={person.avatarUrl} initials={initialsOf(person.name)} /> : <IssueAvatar name={person.name} />}
                        <span className="flex-1 truncate">{person.name}</span>
                        <span className="text-[11px] text-placeholder">{index + 1}</span>
                    </Menu.Item>
                ))}
            </RowMenu>
            <span className="w-14 shrink-0 text-right text-xs text-tertiary">{date}</span>
        </div>
    );
}

function RowMenu({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    const [trigger, ...items] = Array.isArray(children) ? children : [children];
    return (
        <Menu.Root>
            <Menu.Trigger aria-label={label} className={cx("shrink-0 rounded outline-none", className)} render={trigger as ReactElement} />
            <Menu.Portal>
                <Menu.Positioner sideOffset={6} className="z-50">
                    <Menu.Popup className={cx("w-56", overlayChrome.menu)}>
                        <div className="px-2 py-1 text-[11px] text-placeholder">{label}</div>
                        {items}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}

function initialsOf(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}
