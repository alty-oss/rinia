import { useEffect, useState, type ReactNode } from "react";

/**
 * Animates a group open and closed by easing its height and opacity.
 * Content mounts on first open, so collapsed projects do not fetch their documents.
 */
export function Collapse({ open, lazy = true, animate = true, children }: { open: boolean; lazy?: boolean; animate?: boolean; children: ReactNode }) {
    const [mounted, setMounted] = useState(open || !lazy);
    useEffect(() => {
        if (open) setMounted(true);
    }, [open]);
    return (
        <div
            inert={!open}
            className={`grid ${animate ? "transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none" : ""} ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
            <div className="min-h-0 overflow-hidden">{mounted && children}</div>
        </div>
    );
}
