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
    const drag = useRef<{ x: number; width: number } | null>(null);
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
    function toggleSidebar() {
        if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen((open) => !open);
        else setCollapsed((value) => !value);
    }
    function resize(event: PointerEvent<HTMLDivElement>) {
        if (!drag.current) return;
        setWidth(Math.max(220, Math.min(360, drag.current.width + event.clientX - drag.current.x)));
    }
    function resizeKey(event: KeyboardEvent<HTMLDivElement>) {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        setWidth((value) =>
            event.key === "Home" ? 220 : event.key === "End" ? 360 : Math.max(220, Math.min(360, value + (event.key === "ArrowRight" ? 10 : -10))),
        );
    }
    return (
        <NavigationContext.Provider value={{ toggleSidebar }}>
            <div className="relative flex h-dvh min-h-0 overflow-hidden bg-canvas text-primary">
                <aside
                    className={`relative hidden h-full shrink-0 flex-col md:flex ${resizing ? "" : "transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"}`}
                    style={{ width: collapsed ? 0 : width }}
                    aria-label={t("nav.navigation")}
                    aria-hidden={collapsed}
                >
                    <div className="flex h-full min-h-0 flex-col" style={{ width }}>
                        <div className="min-h-0 flex-1">
                            <Sidebar onSearch={() => setSearchOpen(true)} />
                        </div>
                    </div>
                    {!collapsed && (
                        <div
                            role="separator"
                            aria-label={t("nav.resizeSidebar")}
                            aria-orientation="vertical"
                            aria-valuenow={width}
                            aria-valuemin={220}
                            aria-valuemax={360}
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
                <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2 pb-8">
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
