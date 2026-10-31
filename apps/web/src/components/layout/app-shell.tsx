import { Suspense, createContext, useContext, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useHotkeys } from "react-hotkeys-hook";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { NetworkStatus } from "@/components/feedback/network-status";
import { WorkspaceLoadingFallback } from "@/components/feedback/workspace-loading-fallback";
import { AppIcons } from "@/components/foundations/icons";
import { ProjectSearchModal } from "@/features/projects/components/project-search-modal";
import { Sidebar } from "./sidebar";
import { SidebarAccount } from "./sidebar-account";
import { useTranslation } from "react-i18next";

const NavigationContext = createContext({ toggleSidebar: () => {} });
export const useAppNavigation = () => useContext(NavigationContext);
const readWidth = () => {
    const value = Number(localStorage.getItem("rinia-sidebar-width") ?? 244);
    return Number.isFinite(value) ? Math.max(220, Math.min(360, value)) : 244;
};

export const AppShell = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [width, setWidth] = useState(readWidth);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("rinia-sidebar-collapsed") === "true");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [resizing, setResizing] = useState(false);
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        localStorage.setItem("rinia-sidebar-width", String(width));
    }, [width]);
    useEffect(() => {
        localStorage.setItem("rinia-sidebar-collapsed", String(collapsed));
    }, [collapsed]);
    useHotkeys(
        "mod+k",
        (event) => {
            event.preventDefault();
            event.stopPropagation();
            setSearchOpen(true);
        },
        { enableOnFormTags: true, enableOnContentEditable: true, eventListenerOptions: { capture: true } },
    );
    useHotkeys("g>s", () => navigate("/settings/profile"), { enableOnFormTags: false, enableOnContentEditable: false });
    useHotkeys("[", () => toggleSidebar(), { enableOnFormTags: false, enableOnContentEditable: false, useKey: true });
    function toggleSidebar() {
        if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen((open) => !open);
        else setCollapsed((value) => !value);
    }
    return (
        <NavigationContext.Provider value={{ toggleSidebar }}>
            <div className="relative flex h-dvh min-h-0 overflow-hidden bg-canvas text-primary">
                <aside
                    className={`relative hidden h-full shrink-0 overflow-hidden md:flex ${resizing ? "" : "transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"}`}
                    style={{ width: collapsed ? 0 : width }}
                    aria-label={t("nav.navigation")}
                    aria-hidden={collapsed}
                >
                    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ width }}>
                        <div className="min-h-0 flex-1">
                            <Sidebar onSearch={() => setSearchOpen(true)} />
                        </div>
                    </div>
                </aside>
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col p-2 pb-8">
                    <SidebarResizeHandle
                        width={width}
                        collapsed={collapsed}
                        resizing={resizing}
                        onResizeStart={() => {
                            if (collapsed) setCollapsed(false);
                            setResizing(true);
                        }}
                        onResize={(next) => setWidth(Math.max(220, Math.min(360, next)))}
                        onResizeEnd={() => setResizing(false)}
                        onToggle={() => setCollapsed((value) => !value)}
                    />
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-subtle bg-surface-1" data-app-content>
                        <div className="flex h-10 shrink-0 items-center px-2 md:hidden">
                            <ButtonUtility color="tertiary" icon={AppIcons.Menu} tooltip={t("nav.expand")} onClick={toggleSidebar} />
                        </div>
                        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" id="main-content">
                            <Suspense fallback={<WorkspaceLoadingFallback />}>
                                <Outlet />
                            </Suspense>
                        </main>
                    </div>
                </div>
                {collapsed && (
                    <div className="absolute bottom-2 left-2 hidden md:block">
                        <SidebarAccount />
                    </div>
                )}
                <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                    <Dialog.Portal>
                        <Dialog.Backdrop className="fixed inset-0 z-40 bg-backdrop transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col border-r border-subtle bg-canvas outline-none transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
                            <Dialog.Title className="sr-only">{t("nav.navigation")}</Dialog.Title>
                            <Sidebar onSearch={() => { setSearchOpen(true); setMobileOpen(false); }} onNavigate={() => setMobileOpen(false)} />
                        </Dialog.Popup>
                    </Dialog.Portal>
                </Dialog.Root>
                {searchOpen && <ProjectSearchModal onClose={() => setSearchOpen(false)} />}
                <NetworkStatus />
            </div>
        </NavigationContext.Provider>
    );
};

/**
 * Sits on the content panel's left border, as in Linear: drag to resize the sidebar, click to collapse or expand it.
 * A tooltip follows the pointer while hovering.
 */
function SidebarResizeHandle({
    width,
    collapsed,
    resizing,
    onResizeStart,
    onResize,
    onResizeEnd,
    onToggle,
}: {
    width: number;
    collapsed: boolean;
    resizing: boolean;
    onResizeStart: () => void;
    onResize: (width: number) => void;
    onResizeEnd: () => void;
    onToggle: () => void;
}) {
    const { t } = useTranslation();
    const drag = useRef<{ x: number; width: number; moved: boolean } | null>(null);
    const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
    const hintTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(hintTimer.current), []);

    function showHint(event: PointerEvent<HTMLDivElement>) {
        const point = { x: event.clientX, y: event.clientY };
        if (hint) setHint(point);
        else {
            window.clearTimeout(hintTimer.current);
            hintTimer.current = window.setTimeout(() => setHint(point), 400);
        }
    }

    function hideHint() {
        window.clearTimeout(hintTimer.current);
        setHint(null);
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
            return;
        }
        if (collapsed || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        onResize(event.key === "Home" ? 220 : event.key === "End" ? 360 : width + (event.key === "ArrowRight" ? 10 : -10));
    }

    return (
        <>
            <div
                role="separator"
                aria-label={t("nav.resizeSidebar")}
                aria-orientation="vertical"
                aria-valuenow={collapsed ? 0 : width}
                aria-valuemin={220}
                aria-valuemax={360}
                tabIndex={0}
                className="group absolute inset-y-4 left-1 z-20 hidden w-2 cursor-ew-resize touch-none outline-none md:block"
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    drag.current = { x: event.clientX, width, moved: false };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    hideHint();
                }}
                onPointerMove={(event) => {
                    const current = drag.current;
                    if (!current) return showHint(event);
                    const delta = event.clientX - current.x;
                    if (!current.moved && Math.abs(delta) < 3) return;
                    if (!current.moved) {
                        current.moved = true;
                        onResizeStart();
                        // Dragging from a collapsed sidebar grows it from the edge instead of jumping to its old width.
                        if (collapsed) current.width = 220 - delta;
                    }
                    onResize(current.width + delta);
                }}
                onPointerUp={() => {
                    const current = drag.current;
                    drag.current = null;
                    if (current?.moved) onResizeEnd();
                    else if (current) onToggle();
                }}
                onPointerCancel={() => {
                    if (drag.current?.moved) onResizeEnd();
                    drag.current = null;
                }}
                onPointerLeave={hideHint}
                onKeyDown={onKeyDown}
            >
                <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${resizing ? "bg-accent-primary" : "bg-transparent group-hover:bg-[var(--border-strong-1)] group-focus-visible:bg-accent-primary"}`}
                />
            </div>
            {hint && !resizing && (
                <div
                    role="tooltip"
                    className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-md border border-subtle bg-layer-2 px-2.5 py-2 text-[12px] text-secondary shadow-overlay-200"
                    style={{ left: hint.x + 14, top: hint.y + 10 }}
                >
                    <span><strong className="font-medium text-primary">{t("nav.resizeDrag")}</strong> {t("nav.resizeDragHint")}</span>
                    <span className="flex items-center gap-2">
                        <span><strong className="font-medium text-primary">{t("nav.resizeClick")}</strong> {collapsed ? t("nav.resizeExpandHint") : t("nav.resizeCollapseHint")}</span>
                        <kbd className="rounded border border-subtle px-1 font-sans text-[11px] text-tertiary">[</kbd>
                    </span>
                </div>
            )}
        </>
    );
}
