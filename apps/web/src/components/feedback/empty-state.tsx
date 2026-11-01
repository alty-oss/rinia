import { InboxOutline } from "@makeplane/propel/icons";
import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

interface EmptyStateProps {
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    /**
     * A dashed frame suits an empty card inside a panel. A state that fills a whole page or list leaves it out:
     * there the frame would run into the panel's own edges.
     */
    framed?: boolean;
    className?: string;
}

export const EmptyState = ({ title, description, action, framed = true, className }: EmptyStateProps) => (
    <div className={cx("animate-enter flex flex-col items-center justify-center px-5 py-10 text-center", framed && "rounded-lg border border-dashed border-subtle", className)}>
        <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-surface-2 text-placeholder">
            <InboxOutline className="size-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-primary">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-balance text-tertiary">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
