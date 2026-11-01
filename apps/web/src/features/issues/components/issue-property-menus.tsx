import type { ReactNode, SyntheticEvent } from "react";
import { Menu } from "@base-ui/react/menu";
import { EstimateOutline, LabelsOutline } from "@makeplane/propel/icons";
import { issueEstimateValues, type IssuePriority } from "@rinia/shared";
import { useTranslation } from "react-i18next";
import { overlayChrome } from "@/components/overlay/overlay-chrome";
import { IssueAvatar, PriorityIcon, StateIcon } from "@/features/board/components/issue-property-icons";
import { PRIORITY_OPTIONS, priorityLabelKey } from "@/features/issues/lib/priority";
import { translateStatusName } from "@/i18n/status-label";
import { cx } from "@/utils/cx";
import { LabelChip, LabelsPicker, useLabelToggle } from "./labels-picker";

/** Every property icon on issue rows and cards (status, priority, assignee, label, estimate) is this 16px square. */
export const propertyIcon = "size-4";

const menuItem = "flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-[13px] text-secondary outline-none data-highlighted:bg-layer-2-hover";

type Person = { id: string; name: string; avatarUrl: string | null };
type Status = { id: string; name: string; color: string | null };
type Label = { id: string; name: string; color: string | null };

// These menus live inside clickable, draggable cards. Their events must not reach the card, and React
// bubbles events from the portaled popup through the component tree, so the trigger and popup both stop them.
const stop = (event: SyntheticEvent) => event.stopPropagation();
const contained = { onClick: stop, onPointerDown: stop, onKeyDown: stop };

/** A property icon that opens a menu of values. `trigger` is what the icon shows; children are the menu items. */
function PropertyMenu({ label, triggerLabel, trigger, className, children }: { label: string; triggerLabel?: string; trigger: ReactNode; className?: string; children: ReactNode }) {
    return (
        <Menu.Root>
            <Menu.Trigger
                aria-label={triggerLabel ?? label}
                className={cx("flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded outline-none hover:bg-layer-1-hover focus-visible:ring-2 focus-visible:ring-accent-strong", className)}
                {...contained}
            >
                {trigger}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner sideOffset={6} className="z-50">
                    <Menu.Popup className={cx("max-h-80 w-56 overflow-y-auto", overlayChrome.menu)} {...contained}>
                        <div className="px-2 py-1 text-[11px] text-placeholder">{label}</div>
                        {children}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}

function Item({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: ReactNode; onClick: () => void }) {
    return (
        <Menu.Item className={menuItem} onClick={onClick}>
            {icon}
            <span className="flex-1 truncate">{label}</span>
            {hint != null && <span className="text-[11px] text-placeholder">{hint}</span>}
        </Menu.Item>
    );
}

export function AssigneeAvatar({ person }: { person: { name: string; avatarUrl: string | null } }) {
    return <IssueAvatar name={person.name} avatarUrl={person.avatarUrl} className={cx(propertyIcon, "text-[9px]")} />;
}

export function UnassignedIcon() {
    return <span className={cx(propertyIcon, "shrink-0 rounded-full border border-dashed border-strong")} />;
}

function LabelIcon({ color, muted = false }: { color?: string | null; muted?: boolean }) {
    return <LabelsOutline className={cx(propertyIcon, "shrink-0", muted && "text-placeholder")} style={muted ? undefined : { color: color ?? "#7a5af8" }} />;
}

export function StatusMenu({ value, statuses, onChange, className }: { value?: Status; statuses: Status[]; onChange: (columnId: string) => void; className?: string }) {
    const { t } = useTranslation();
    return (
        <PropertyMenu label={t("issue.status")} className={cx("text-tertiary", className)} trigger={<StateIcon name={value?.name ?? ""} color={value?.color} className={propertyIcon} />}>
            {statuses.map((status, index) => (
                <Item key={status.id} icon={<StateIcon name={status.name} color={status.color} className={propertyIcon} />} label={translateStatusName(status.name, t)} hint={index + 1} onClick={() => onChange(status.id)} />
            ))}
        </PropertyMenu>
    );
}

export function PriorityMenu({ value, onChange, className }: { value: string; onChange: (priority: IssuePriority) => void; className?: string }) {
    const { t } = useTranslation();
    return (
        <PropertyMenu label={t("issue.priority")} className={className} trigger={<PriorityIcon priority={value} className={propertyIcon} />}>
            {PRIORITY_OPTIONS.map((priority, index) => (
                <Item key={priority} icon={<PriorityIcon priority={priority} className={propertyIcon} />} label={t(priorityLabelKey(priority))} hint={index + 1} onClick={() => onChange(priority)} />
            ))}
        </PropertyMenu>
    );
}

export function AssigneeMenu({ value, people, onChange, className }: { value?: Person; people: Person[]; onChange: (assigneeId: string | null) => void; className?: string }) {
    const { t } = useTranslation();
    return (
        <PropertyMenu label={t("issue.assignee")} triggerLabel={value?.name ?? t("issue.unassigned")} className={className} trigger={value ? <AssigneeAvatar person={value} /> : <UnassignedIcon />}>
            <Item icon={<UnassignedIcon />} label={t("issue.unassigned")} onClick={() => onChange(null)} />
            {people.map((person, index) => (
                <Item key={person.id} icon={<AssigneeAvatar person={person} />} label={person.name} hint={index + 1} onClick={() => onChange(person.id)} />
            ))}
        </PropertyMenu>
    );
}

/** How many label chips a row or card shows before folding the rest into "+N". */
const VISIBLE_LABELS = 2;

/** Shows the issue's labels as chips; an unlabeled issue shows a faint icon to add some. Opens the multi-select picker. */
export function LabelMenu({ value, labels, onChange, className }: { value: Label[]; labels: Label[]; onChange: (categoryIds: string[]) => void; className?: string }) {
    const { t } = useTranslation();
    const editor = useLabelToggle(value.map((label) => label.id), onChange);
    const hidden = value.length - VISIBLE_LABELS;
    return (
        <LabelsPicker
            labels={labels}
            state={editor.state}
            onToggle={editor.toggle}
            onClose={editor.reset}
            stopPropagation
            triggerLabel={value.length ? value.map((label) => label.name).join(", ") : t("issue.addLabel")}
            triggerClassName={cx("flex h-5 min-w-0 shrink items-center gap-1 rounded outline-none hover:bg-layer-1-hover focus-visible:ring-2 focus-visible:ring-accent-strong data-[popup-open]:bg-layer-1-hover", className)}
        >
            {value.length === 0 && <LabelIcon muted />}
            {value.slice(0, VISIBLE_LABELS).map((label) => <LabelChip key={label.id} label={label} className="max-w-28" />)}
            {hidden > 0 && <span className="shrink-0 px-0.5 text-[11px] text-tertiary">+{hidden}</span>}
        </LabelsPicker>
    );
}

/** Shows the points next to the icon when the issue is estimated; otherwise a faint icon to set them. */
export function EstimateMenu({ value, onChange, className }: { value: number | null; onChange: (estimate: number | null) => void; className?: string }) {
    const { t } = useTranslation();
    const icon = (muted: boolean) => <EstimateOutline className={cx(propertyIcon, "shrink-0", muted ? "text-placeholder" : "text-tertiary")} />;
    return (
        <PropertyMenu
            label={t("issue.estimate")}
            triggerLabel={value != null ? t("projects.points", { count: value }) : t("issue.setEstimate")}
            className={cx(value != null && "px-1 text-[11px] text-secondary", className)}
            trigger={value != null ? <>{icon(false)}{value}</> : icon(true)}
        >
            <Item icon={icon(true)} label={t("issue.noEstimate")} onClick={() => onChange(null)} />
            {issueEstimateValues.map((points) => (
                <Item key={points} icon={icon(false)} label={t("projects.points", { count: points })} onClick={() => onChange(points)} />
            ))}
        </PropertyMenu>
    );
}
