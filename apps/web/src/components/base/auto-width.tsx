import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/utils/cx";
import { MOTION } from "./motion";

/**
 * Text whose width eases to fit when it changes, so added words slide into view instead of jumping in. Growing
 * takes the enter time and shrinking the quicker exit time. `className` goes on the text itself: give it a
 * max width and `truncate` to keep an ellipsis on long values.
 */
export function AutoWidth({ children, className }: { children: ReactNode; className?: string }) {
    const inner = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<number | null>(null);
    const [growing, setGrowing] = useState(true);

    useLayoutEffect(() => {
        const element = inner.current;
        if (!element) return;
        const observer = new ResizeObserver(() => {
            const next = element.getBoundingClientRect().width;
            setWidth((current) => {
                if (current !== null && next !== current) setGrowing(next > current);
                return next;
            });
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <span
            className="flex shrink-0 overflow-hidden transition-[width] motion-reduce:transition-none"
            style={{
                width: width ?? undefined,
                transitionDuration: `${growing ? MOTION.enter : MOTION.exit}ms`,
                transitionTimingFunction: `var(${growing ? "--motion-ease-enter" : "--motion-ease-exit"})`,
            }}
        >
            <span ref={inner} className={cx("block shrink-0 whitespace-nowrap", className)}>
                {children}
            </span>
        </span>
    );
}
