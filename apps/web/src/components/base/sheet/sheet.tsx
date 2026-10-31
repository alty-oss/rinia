import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cx } from "@/utils/cx";

interface SheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: ReactNode;
    className?: string;
}

/** A controlled right-side panel built on Base UI Dialog primitives. */
export const Sheet = ({ open, onOpenChange, title, children, className }: SheetProps) => (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
        <BaseDialog.Portal>
            <BaseDialog.Backdrop className="fixed inset-0 z-30 bg-transparent transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <BaseDialog.Viewport className="fixed inset-0 z-40 flex justify-end md:top-10 md:right-2 md:bottom-2 md:left-2">
                <BaseDialog.Popup className={cx("flex h-full w-full min-w-0 flex-col border-l border-subtle bg-surface-1 outline-none transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:translate-x-6 data-[ending-style]:opacity-0 data-[starting-style]:translate-x-6 data-[starting-style]:opacity-0 md:w-1/2 md:rounded-r-lg", className)}>
                    <BaseDialog.Title className="sr-only">{title}</BaseDialog.Title>
                    {children}
                </BaseDialog.Popup>
            </BaseDialog.Viewport>
        </BaseDialog.Portal>
    </BaseDialog.Root>
);
