import { Suspense, createContext, useContext, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useHotkeys } from "react-hotkeys-hook";
import { Link, Outlet, useLocation } from "react-router";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { NetworkStatus } from "@/components/feedback/network-status";
import { WorkspaceLoadingFallback } from "@/components/feedback/workspace-loading-fallback";
import { AppIcons } from "@/components/foundations/icons";
import { RiniaIcon } from "@/components/foundations/logo/rinia-icon";
import { ProjectSearchModal } from "@/features/projects/components/project-search-modal";
import { Sidebar } from "./sidebar";
import { SidebarAccount } from "./sidebar-account";
import { useTranslation } from "react-i18next";

const NavigationContext = createContext({ toggleSidebar: () => {} });
export const useAppNavigation = () => useContext(NavigationContext);
const readWidth = () => {
    const value = Number(localStorage.getItem("rinia-sidebar-width") ?? 250);
    return Number.isFinite(value) ? Math.max(236, Math.min(350, value)) : 250;
};

export const AppShell = () => {
    const location = useLocation();
    const { t } = useTranslation();
    const [width, setWidth] = useState(readWidth);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("rinia-sidebar-collapsed") === "true");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const drag = useRef<{ x: number; width: number } | null>(null);
    const [resizing, setResizing] = useState(false);
    const settings = location.pathname === "/settings/profile";
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
    function toggleSidebar() {
        if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen((open) => !open);
        else setCollapsed((value) => !value);
    }
    function resize(event: PointerEvent<HTMLDivElement>) {
        if (!drag.current) return;
        setWidth(Math.max(236, Math.min(350, drag.current.width + event.clientX - drag.current.x)));
    }
    function resizeKey(event: KeyboardEvent<HTMLDivElement>) {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setWidth((value) =>
            event.key === "Home" ? 236 : event.key === "End" ? 350 : Math.max(236, Math.min(350, value + (event.key === "ArrowRight" ? 10 : -10))),
        );
    }
    const railItem =
        "flex w-full flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-medium text-tertiary transition-colors duration-150 hover:bg-layer-1-hover hover:text-primary focus-visible:outline-accent-strong";
    return (
        <NavigationContext.Provider value={{ toggleSidebar }}>
            <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-primary">
                <header className="flex h-10 shrink-0 items-center gap-2 px-3" aria-label={t("nav.search")}>
                    <span className="md:hidden">
                        <ButtonUtility color="tertiary" icon={AppIcons.Menu} tooltip={t("nav.expand")} onClick={toggleSidebar} />
                    </span>
                    <Link to="/" className="flex items-center gap-2 rounded-sm text-[13px] font-semibold" aria-label="Rinia">
                        <RiniaIcon className="size-4 text-primary" />
                        Rinia
                    </Link>
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="mx-auto flex h-7 w-72 max-w-[50vw] items-center gap-2 rounded-md border border-subtle bg-surface-1 px-2 text-xs text-placeholder transition-colors duration-150 hover:bg-layer-1-hover"
                        aria-label={t("nav.search")}
                    >
                        <AppIcons.Search className="size-3.5" />
                        <span className="truncate">{t("nav.search")}</span>
                        <kbd className="ml-auto shrink-0 rounded border border-subtle px-1 text-[10px] text-tertiary">⌘K</kbd>
                    </button>
                </header>
                <div className="flex min-h-0 flex-1 pr-2 pb-2 max-md:px-2">
                    <nav className="hidden w-14 shrink-0 flex-col items-center gap-3 px-1.5 py-2 md:flex" aria-label={t("nav.applications")}>
                        <Link to="/" className={`${railItem} ${!settings ? "bg-layer-1 text-primary" : ""}`} aria-current={!settings ? "page" : undefined}>
                            <AppIcons.Projects className="size-5" />
                            {t("nav.projects")}
                        </Link>
                        <div className="mx-2 w-6 border-t border-strong" />
                        <Link
                            to="/settings/profile"
                            className={`${railItem} ${settings ? "bg-layer-1 text-primary" : ""}`}
                            aria-current={settings ? "page" : undefined}
                        >
                            <AppIcons.Settings className="size-5" />
                            {t("nav.config")}
                        </Link>
                        {collapsed && (
                            <div className="mt-auto pb-1">
                                <SidebarAccount />
                            </div>
                        )}
                    </nav>
                    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-subtle bg-surface-1" data-app-content>
                        <aside
                            className={`relative hidden h-full shrink-0 overflow-hidden bg-surface-1 md:block ${collapsed ? "" : "border-r border-subtle"} ${resizing ? "" : "transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"}`}
                            style={{ width: collapsed ? 0 : width }}
                            aria-label={t("nav.projects")}
                            aria-hidden={collapsed}
                        >
                            <div className="h-full" style={{ width }}>
                                <Sidebar onCollapse={toggleSidebar} />
                            </div>
                            {!collapsed && (
                                <div
                                    role="separator"
                                    aria-label={t("nav.resizeSidebar")}
                                    aria-orientation="vertical"
                                    aria-valuenow={width}
                                    aria-valuemin={236}
                                    aria-valuemax={350}
                                    tabIndex={0}
                                    className={`absolute inset-y-0 right-0 z-20 w-1 cursor-ew-resize touch-none hover:bg-layer-2 ${resizing ? "bg-accent-primary" : ""}`}
                                    onPointerDown={(event) => {
                                        drag.current = { x: event.clientX, width };
                                        setResizing(true);
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                    }}
                                    onPointerMove={resize}
                                    onPointerUp={() => {
                                        drag.current = null;
                                        setResizing(false);
                                    }}
                                    onPointerCancel={() => {
                                        drag.current = null;
                                        setResizing(false);
                                    }}
                                    onKeyDown={resizeKey}
                                    onDoubleClick={toggleSidebar}
                                />
                            )}
                        </aside>
                        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" id="main-content">
                            <Suspense fallback={<WorkspaceLoadingFallback />}>
                                <Outlet />
                            </Suspense>
                        </main>
                    </div>
                </div>
                <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                    <Dialog.Portal>
                        <Dialog.Backdrop className="fixed inset-0 z-40 bg-backdrop transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
                        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r border-subtle bg-surface-1 outline-none transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
                            <Dialog.Title className="sr-only">{t("nav.navigation")}</Dialog.Title>
                            <Sidebar onCollapse={() => setMobileOpen(false)} />
                        </Dialog.Popup>
                    </Dialog.Portal>
                </Dialog.Root>
                {searchOpen && <ProjectSearchModal onClose={() => setSearchOpen(false)} />}
                <NetworkStatus />
            </div>
        </NavigationContext.Provider>
    );
};
