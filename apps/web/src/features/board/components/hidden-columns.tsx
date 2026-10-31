import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Eye, MoreHorizontal } from "lucide-react";
import { Collapse } from "@/components/base/collapse";
import { overlayChrome } from "@/components/overlay/overlay-chrome";
import { translateStatusName } from "@/i18n/status-label";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";
import type { BoardColumn } from "../api";
import { StateIcon } from "./issue-property-icons";

function storageKey(projectId: string) {
    return `rinia-hidden-columns:${projectId}`;
}

function readHidden(projectId: string): Set<string> {
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey(projectId)) ?? "[]");
        if (Array.isArray(stored)) return new Set(stored.filter((id): id is string => typeof id === "string"));
    } catch {
        /* ignore invalid storage */
    }
    return new Set();
}

/** Columns the user hid on this project's board, remembered in this browser. */
export function useHiddenColumns(projectId: string) {
    const [hidden, setHidden] = useState(() => readHidden(projectId));
    const [forProject, setForProject] = useState(projectId);
    if (forProject !== projectId) {
        setForProject(projectId);
        setHidden(readHidden(projectId));
    }
    function update(change: (next: Set<string>) => void) {
        setHidden((current) => {
            const next = new Set(current);
            change(next);
            try {
                localStorage.setItem(storageKey(projectId), JSON.stringify([...next]));
            } catch {
                /* Storage is optional; the choice still applies for this visit. */
            }
            return next;
        });
    }
    return {
        hidden,
        hideColumn: (columnId: string) => update((next) => next.add(columnId)),
        showColumn: (columnId: string) => update((next) => next.delete(columnId)),
    };
}

/** Linear-style list of hidden columns at the end of the board, each with its issue count. */
export function HiddenColumns({ columns, countFor, onShow }: { columns: BoardColumn[]; countFor: (columnId: string) => number; onShow: (columnId: string) => void }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(true);
    return (
        <div className={cx("shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)]", columns.length ? "w-72 opacity-100" : "pointer-events-none w-0 opacity-0")} aria-hidden={!columns.length}>
            <Collapse open={columns.length > 0} lazy={false}>
                <section aria-label={t("projects.hiddenColumns")} className="w-72">
                    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-10 items-center gap-1.5 px-1 text-[13px] font-medium text-secondary hover:text-primary">
                        <ChevronDown className={cx("size-3.5 text-tertiary transition-transform duration-200", !open && "-rotate-90")} />
                        {t("projects.hiddenColumns")}
                    </button>
                    <Collapse open={open} lazy={false}>
                        <ul className="flex flex-col gap-1.5">
                            {columns.map((column) => {
                                const label = translateStatusName(column.name, t);
                                return (
                                    <li key={column.id} className="animate-enter flex h-10 items-center gap-2.5 rounded-lg border border-subtle bg-surface-1 pr-1.5 pl-3 text-[13px]">
                                        <button type="button" onClick={() => onShow(column.id)} title={t("projects.showColumn")} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                                            <StateIcon name={column.name} color={column.color} className="size-4" />
                                            <span className="min-w-0 flex-1 truncate font-medium text-primary">{label}</span>
                                            <span className="text-tertiary tabular-nums">{countFor(column.id)}</span>
                                        </button>
                                        <Menu.Root>
                                            <Menu.Trigger aria-label={`${t("projects.columnActions")} · ${label}`} className="grid size-6 place-items-center rounded text-tertiary outline-none hover:bg-layer-transparent-hover hover:text-primary data-[popup-open]:bg-layer-transparent-hover">
                                                <MoreHorizontal className="size-4" />
                                            </Menu.Trigger>
                                            <Menu.Portal>
                                                <Menu.Positioner sideOffset={4} align="end" className="z-50">
                                                    <Menu.Popup className={cx("w-48 origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0", overlayChrome.menu)}>
                                                        <Menu.Item onClick={() => onShow(column.id)} className="flex h-8 cursor-pointer items-center gap-2.5 rounded px-2 text-[13px] text-secondary outline-none data-highlighted:bg-layer-2-hover data-highlighted:text-primary">
                                                            <Eye className="size-4 text-tertiary" />
                                                            {t("projects.showColumn")}
                                                        </Menu.Item>
                                                    </Menu.Popup>
                                                </Menu.Positioner>
                                            </Menu.Portal>
                                        </Menu.Root>
                                    </li>
                                );
                            })}
                        </ul>
                    </Collapse>
                </section>
            </Collapse>
        </div>
    );
}
