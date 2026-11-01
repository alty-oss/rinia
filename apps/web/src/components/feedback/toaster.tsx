import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Copy, X, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Shows a short-lived message in the bottom-right corner. */
export const useToast = () => useContext(ToastContext);

const VISIBLE_MS = 4000;
/** Toasts with an action stay longer, so there is time to use it. */
const VISIBLE_WITH_ACTION_MS = 8000;
const EXIT_MS = 180;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
        window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), EXIT_MS);
    }, []);

    const show = useCallback(
        (toast: ToastInput) => {
            const id = nextId.current++;
            // Keep at most three on screen; the oldest leaves first.
            setToasts((current) => [...current.filter((entry) => !entry.leaving).slice(-2), { ...toast, id, leaving: false }]);
            window.setTimeout(() => dismiss(id), toast.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS);
        },
        [dismiss],
    );

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
    const [entered, setEntered] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(frame);
    }, []);
    const visible = entered && !toast.leaving;
    const Icon = toast.tone === "error" ? XCircle : toast.tone === "copy" ? Copy : CheckCircle2;

    return (
        <div
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-subtle bg-layer-2 px-3.5 py-3 shadow-overlay-200 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
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
                        toast.action?.onClick();
                        onDismiss();
                    }}
                    className="-my-0.5 shrink-0 rounded-md px-2 py-0.5 text-[13px] font-medium text-accent-primary transition-colors duration-150 hover:bg-layer-transparent-hover"
                >
                    {toast.action.label}
                </button>
            )}
            <button type="button" aria-label={t("common.close")} onClick={onDismiss} className="grid size-5 shrink-0 place-items-center rounded text-tertiary hover:bg-layer-transparent-hover hover:text-primary">
                <X className="size-3.5" />
            </button>
        </div>
    );
}
