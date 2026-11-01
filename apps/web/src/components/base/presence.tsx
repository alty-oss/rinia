import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Collapse } from "./collapse";
import { UNMOUNT_AFTER } from "./motion";

export type PresenceRow<T> = { key: string; item: T; leaving: boolean; entering: boolean };

/**
 * A list that remembers what just left it. Removed items stay, marked `leaving`, until they have animated out;
 * items added after the first list arrives are marked `entering`. The first list renders in place.
 */
export function usePresence<T>(items: T[] | undefined, keyOf: (item: T) => string): PresenceRow<T>[] {
    const keyOfRef = useRef(keyOf);
    keyOfRef.current = keyOf;
    const ready = useRef(items !== undefined);
    const [rows, setRows] = useState<PresenceRow<T>[]>(() => (items ?? []).map((item) => ({ key: keyOf(item), item, leaving: false, entering: false })));

    useEffect(() => {
        if (!items) return;
        const animate = ready.current;
        ready.current = true;
        setRows((current) => {
            const known = new Set(current.filter((row) => !row.leaving).map((row) => row.key));
            const next: PresenceRow<T>[] = items.map((item) => {
                const key = keyOfRef.current(item);
                return { key, item, leaving: false, entering: animate && !known.has(key) };
            });
            const present = new Set(next.map((row) => row.key));
            current.forEach((row, index) => {
                if (!present.has(row.key)) next.splice(Math.min(index, next.length), 0, { ...row, leaving: true, entering: false });
            });
            return next;
        });
    }, [items]);

    const leaving = rows.some((row) => row.leaving);
    useEffect(() => {
        if (!leaving) return;
        const timer = window.setTimeout(() => setRows((current) => current.filter((row) => !row.leaving)), UNMOUNT_AFTER);
        return () => window.clearTimeout(timer);
    }, [leaving]);

    return rows;
}

/**
 * False for the first commit of something that should animate in, then true. Reading layout in between makes the
 * browser take the closed state first, so switching to open transitions, without waiting for an animation frame
 * (which never comes in a background tab).
 */
export function useEntered(animate: boolean) {
    const [entered, setEntered] = useState(!animate);
    useLayoutEffect(() => {
        if (entered) return;
        void document.body.offsetHeight;
        setEntered(true);
    }, [entered]);
    return entered;
}

/** Eases a row's height (or, with `axis="x"`, an inline item's width) and opacity in when it is `entering`, and out while it is `leaving`. */
export function Presence({ leaving, entering, axis = "y", children }: { leaving: boolean; entering: boolean; axis?: "x" | "y"; children: ReactNode }) {
    const entered = useEntered(entering);
    return (
        <Collapse open={entered && !leaving} lazy={false} axis={axis}>
            {children}
        </Collapse>
    );
}

/**
 * One thing that comes and goes, such as a button that only shows while filters are on. It eases in when `show`
 * turns on and stays mounted while it eases out. What is there on first render shows in place, without animating.
 */
export function Reveal({ show, axis = "y", children }: { show: boolean; axis?: "x" | "y"; children: ReactNode }) {
    const [mounted, setMounted] = useState(show);
    const [open, setOpen] = useState(show);
    if (show && !mounted) setMounted(true);
    if (!show && open) setOpen(false);
    useLayoutEffect(() => {
        if (!show || open) return;
        void document.body.offsetHeight;
        setOpen(true);
    }, [show, open]);
    useEffect(() => {
        if (show) return;
        const timer = window.setTimeout(() => setMounted(false), UNMOUNT_AFTER);
        return () => window.clearTimeout(timer);
    }, [show]);
    if (!mounted) return null;
    return (
        <Collapse open={open} lazy={false} axis={axis}>
            {children}
        </Collapse>
    );
}
