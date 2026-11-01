import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Copy, X, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UNMOUNT_AFTER, motionTiming } from "@/components/base/motion";
import { useEntered } from "@/components/base/presence";

type ToastTone = "success" | "error" | "copy";

export interface ToastInput {
    title: string;
    description?: string;
    tone?: ToastTone;
    /** A button in the toast, such as "Undo". Using it closes the toast. */
    action?: { label: string; onClick: () => void };
}

interface ToastEntry extends ToastInput {
    id: number;
    leaving: boolean;
    duration: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Shows a short-lived message in the bottom-right corner. */
export const useToast = () => useContext(ToastContext);

const VISIBLE_MS = 4000;
/** Toasts with an action stay longer, so there is time to use it. */
const VISIBLE_WITH_ACTION_MS = 10000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const nextId = useRef(0);
    const timers = useRef(new Map<number, number>());

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
        const timer = timers.current.get(id);
        if (timer != null) window.clearTimeout(timer);
        timers.current.delete(id);
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), UNMOUNT_AFTER);
    }, []);

    const show = useCallback(
        (toast: ToastInput) => {
            const id = nextId.current++;
            const duration = toast.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS;
            // Keep at most three on screen; the oldest leaves first.
            setToasts((current) => [...current.filter((entry) => !entry.leaving).slice(-2), { ...toast, id, duration, leaving: false }]);
            timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
        },
        [dismiss],
    );

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "z") return;
            const target = event.target as HTMLElement | null;
            if (target?.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) return;
            const latest = [...toasts].reverse().find((toast) => toast.action && !toast.leaving);
            if (!latest?.action) return;
            event.preventDefault();
            void Promise.resolve().then(latest.action.onClick).catch(() => undefined);
            dismiss(latest.id);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [dismiss, toasts]);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastCard({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
    const { t } = useTranslation();
    const entered = useEntered(true);
    const visible = entered && !toast.leaving;
    const Icon = toast.tone === "error" ? XCircle : toast.tone === "copy" ? Copy : CheckCircle2;

    return (
        <div
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-subtle bg-layer-2 px-3.5 py-3 shadow-overlay-200 transition-all motion-reduce:transition-none ${motionTiming(visible)} ${
                visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
        >
            <Icon className={`mt-px size-4 shrink-0 ${toast.tone === "error" ? "text-danger-primary" : "text-tertiary"}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium break-words text-primary">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] text-tertiary">{toast.description}</p>}
            </div>
            {toast.action && (
                <button
                    type="button"
                    onClick={() => {
                        void Promise.resolve().then(() => toast.action?.onClick()).catch(() => undefined);
                        onDismiss();
                    }}
                    className="-my-0.5 shrink-0 rounded-md px-2 py-0.5 text-[13px] font-medium text-accent-primary transition-colors duration-150 hover:bg-layer-transparent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
                >
                    {toast.action.label}
                </button>
            )}
            <button type="button" aria-label={t("common.close")} onClick={onDismiss} className="grid size-5 shrink-0 place-items-center rounded text-tertiary hover:bg-layer-transparent-hover hover:text-primary">
                <X className="size-3.5" />
            </button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-xl bg-layer-3" aria-hidden="true">
                <div className="h-full origin-left animate-[toast-countdown_linear_forwards] bg-accent-primary" style={{ animationDuration: `${toast.duration}ms` }} />
            </div>
        </div>
    );
}
