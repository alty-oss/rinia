import { Popover } from "@base-ui/react/popover";
import type { FC, ReactNode } from "react";
import type { TFunction } from "i18next";
import type { IssueView } from "@rinia/shared";
import { AddOutline, AssigneeOutline, CloseOutline, DisplayOutline, FilterOutline, HistoryOutline, LabelsOutline, ListOutline, PriorityOutline, SearchOutline, StateOutline } from "@makeplane/propel/icons";
import { CalendarClock, CalendarDays, CalendarX2, Hash, Minus } from "lucide-react";
import { IssueAvatar, PriorityIcon, StateIcon } from "@/features/board/components/issue-property-icons";
import { useSearchParams } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { overlayChrome } from "@/components/overlay/overlay-chrome";
import { cx } from "@/utils/cx";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { useColumns } from "@/features/board/hooks/use-board";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useProjectMembers } from "@/features/projects/hooks/use-project-members";
import { readIssueOrder } from "../lib/issue-filters";
import { useTranslation } from "react-i18next";
import { PRIORITY_OPTIONS, priorityLabelKey } from "@/features/issues/lib/priority";
import { translateStatusName } from "@/i18n/status-label";

/** Late open issues, and those due between today and Saturday. Shared with lists that span projects. */
export function dueFilter(t: TFunction): IssueFilter {
    return {
        key: "due",
        label: t("issue.dueDate"),
        items: [
            { id: "overdue", name: t("issue.overdue"), icon: <CalendarX2 className="size-3.5 text-danger-primary" /> },
            { id: "thisWeek", name: t("issue.dueThisWeek"), icon: <CalendarClock className="size-3.5 text-warning-primary" /> },
        ],
    };
}

export type IssueFilter = { key: string; label: string; items: Array<{ id: string; name: string; icon?: ReactNode; avatarUrl?: string | null }> };
type DisplayOption = { id: string; label: string; icon: FC<{ className?: string }> };

export function IssueToolbar({
    projectId = "",
    onCreate,
    layout = "list",
    compact = false,
    chrome = false,
    filters: customFilters,
    orders,
    groups,
    defaultOrder = "position",
}: {
    /** The project whose states, priorities, people, and labels fill the filters. Lists that span projects pass `filters` instead. */
    projectId?: string;
    onCreate?: () => void;
    layout?: IssueView;
    compact?: boolean;
    chrome?: boolean;
    filters?: IssueFilter[];
    /** The orders and groupings offered under Display, when they differ from a project's. */
    orders?: DisplayOption[];
    groups?: DisplayOption[];
    defaultOrder?: string;
}) {
    const [query, setQuery] = useSearchParams();
    const { t } = useTranslation();
    const { data: columns } = useColumns(customFilters ? "" : projectId);
    const { data: categories } = useCategories(customFilters ? "" : projectId);
    const { data: members } = useProjectMembers(customFilters ? "" : projectId);
    function update(key: string, value: string) {
        setQuery(
            (current) => {
                const next = new URLSearchParams(current);
                if (value) next.set(key, value);
                else next.delete(key);
                return next;
            },
            { replace: true },
        );
    }
    const filters: IssueFilter[] = customFilters ?? [
        { key: "status", label: t("issue.status"), items: (columns ?? []).map((item) => ({ id: item.id, name: translateStatusName(item.name, t), icon: <StateIcon name={item.name} color={item.color} /> })) },
        { key: "priority", label: t("issue.priority"), items: PRIORITY_OPTIONS.map((id) => ({ id, name: t(priorityLabelKey(id)), icon: <PriorityIcon priority={id} /> })) },
        { key: "assignee", label: t("issue.assignee"), items: (members ?? []).map((member) => ({ id: member.id, name: member.name, avatarUrl: member.avatarUrl, icon: member.avatarUrl ? undefined : <IssueAvatar name={member.name} avatarUrl={member.avatarUrl} /> })) },
        { key: "label", label: t("issue.label"), items: (categories ?? []).map((item) => ({ id: item.id, name: item.name, icon: <LabelsOutline className="size-3.5" style={{ color: item.color ?? "#7a5af8" }} /> })) },
        dueFilter(t),
    ];
    const count = filters.filter((filter) => query.get(filter.key)).length;
    const popup = cx("grid w-[min(320px,calc(100vw-32px))] gap-3", overlayChrome.popupPadded);
    return (
        <div className={chrome ? "flex items-center gap-1" : compact ? "board-toolbar min-w-0" : "shrink-0 border-b border-subtle"}>
            <div className={chrome ? "flex items-center gap-1" : compact ? "flex items-center gap-2" : "flex h-[45px] flex-wrap items-center gap-2 px-3.5"}>
                <Popover.Root>
                    {(compact || chrome) && count === 0 ? (
                        <Popover.Trigger render={<Button aria-label={t("issue.filters")} size={chrome ? "xs" : undefined} color="secondary" iconLeading={FilterOutline} />} />
                    ) : (
                        <Popover.Trigger render={<Button aria-label={t("issue.filters")} size={chrome ? "xs" : undefined} color={compact || chrome ? "secondary" : "tertiary"} iconLeading={FilterOutline} />}>
                            {!compact && !chrome ? t("issue.filters") : null}{count ? ` · ${count}` : ""}
                        </Popover.Trigger>
                    )}
                    <Popover.Portal>
                        <Popover.Positioner sideOffset={8} align="start" className="z-30">
                            <Popover.Popup className={popup}>
                                <Popover.Title className="text-sm font-medium">{t("issue.filterTitle")}</Popover.Title>
                                {filters.map((filter) => (
                                    <Select
                                        key={filter.key}
                                        label={filter.label}
                                        size="sm"
                                        selectedKey={query.get(filter.key) ?? ""}
                                        onSelectionChange={(value) => update(filter.key, String(value ?? ""))}
                                        items={[{ id: "", label: t("issue.all") }, ...filter.items.map((item) => ({ id: item.id, label: item.name, icon: item.icon, avatarUrl: item.avatarUrl ?? undefined }))]}
                                    >
                                        {(item) => <Select.Item id={item.id} icon={item.icon} avatarUrl={item.avatarUrl}>{item.label}</Select.Item>}
                                    </Select>
                                ))}
                            </Popover.Popup>
                        </Popover.Positioner>
                    </Popover.Portal>
                </Popover.Root>
                {compact ? <Popover.Root>
                    <Popover.Trigger render={<Button aria-label={t("issue.searchIssues")} color="tertiary" iconLeading={SearchOutline} />} />
                    <Popover.Portal><Popover.Positioner sideOffset={8} align="end" className="z-30"><Popover.Popup className={popup}>
                        <Popover.Title className="sr-only">{t("issue.searchIssues")}</Popover.Title>
                        <Input size="sm" value={query.get("q") ?? ""} onChange={(value) => update("q", value)} placeholder={t("issue.searchIssues")} icon={SearchOutline} />
                    </Popover.Popup></Popover.Positioner></Popover.Portal>
                </Popover.Root> : chrome ? null : (<div className="w-40">
                    <Input
                        size="sm"
                        value={query.get("q") ?? ""}
                        onChange={(value) => update("q", value)}
                        placeholder={t("issue.searchIssues")}
                        icon={SearchOutline}
                        wrapperClassName="bg-transparent ring-0 shadow-none focus-within:ring-1"
                    />
                </div>)}
                <div className={cx("ml-auto flex items-center", chrome ? "gap-1" : "gap-2")}>
                    <Popover.Root>
                    <Popover.Trigger render={<Button aria-label={t("issue.display")} size={chrome ? "xs" : undefined} color={compact || chrome ? "secondary" : "tertiary"} iconLeading={DisplayOutline} />}>{chrome || compact ? null : t("issue.display")}</Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Positioner sideOffset={8} align="end" className="z-30">
                                <Popover.Popup className={popup}>
                                    <Popover.Title className="text-sm font-medium">{t("issue.displayOptions")}</Popover.Title>
                                    <Select
                                        label={t("issue.orderBy")}
                                        size="sm"
                                        selectedKey={orders ? (query.get("order") ?? defaultOrder) : readIssueOrder(query.get("order"))}
                                        onSelectionChange={(value) => update("order", value === defaultOrder ? "" : String(value ?? ""))}
                                        items={orders ?? [
                                            { id: "position", label: t("issue.manualOrder"), icon: ListOutline },
                                            { id: "priority", label: t("issue.priority"), icon: PriorityOutline },
                                            { id: "updated", label: t("issue.recentlyUpdated"), icon: HistoryOutline },
                                            { id: "number", label: t("issue.issueNumber"), icon: Hash },
                                            { id: "due", label: t("issue.dueDate"), icon: CalendarDays },
                                        ]}
                                    >
                                        {(item) => <Select.Item id={item.id} icon={item.icon}>{item.label}</Select.Item>}
                                    </Select>
                                    {layout === "list" && (
                                        <Select
                                            label={t("issue.groupBy")}
                                            size="sm"
                                        selectedKey={query.get("group") ?? "status"}
                                        onSelectionChange={(value) => update("group", value === "status" ? "" : String(value ?? ""))}
                                            items={groups ?? [
                                                { id: "none", label: t("issue.noGrouping"), icon: Minus },
                                                { id: "status", label: t("issue.status"), icon: StateOutline },
                                                { id: "assignee", label: t("issue.assignee"), icon: AssigneeOutline },
                                            ]}
                                        >
                                            {(item) => <Select.Item id={item.id} icon={item.icon}>{item.label}</Select.Item>}
                                        </Select>
                                    )}
                                </Popover.Popup>
                            </Popover.Positioner>
                        </Popover.Portal>
                    </Popover.Root>
                    {!chrome && onCreate && <Button iconLeading={compact ? undefined : AddOutline} onClick={onCreate}>
                        {t("issue.newIssue")}
                    </Button>}
                </div>
            </div>
            {count > 0 && (
                <div className={compact ? "absolute top-full right-0 z-10 flex flex-wrap gap-2 border border-subtle bg-surface-1 p-2" : "flex flex-wrap gap-2 border-t border-subtle px-4 py-2"}>
                    {filters
                        .filter((filter) => query.get(filter.key))
                        .map((filter) => {
                            const selected = filter.items.find((item) => item.id === query.get(filter.key));
                            return (
                            <button
                                key={filter.key}
                                onClick={() => update(filter.key, "")}
                                className="flex items-center gap-1 rounded border border-subtle bg-layer-1 px-2 py-0.5 text-xs text-secondary"
                                aria-label={t("issue.clearFilter", { filter: filter.label })}
                            >
                                {selected?.icon}
                                {filter.label}: {selected?.name ?? t("issue.selected")}
                                <CloseOutline className="size-3" />
                            </button>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
