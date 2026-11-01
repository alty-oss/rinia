import { useEffect, useRef, useState, type ReactNode } from "react";
import { Collapse } from "./collapse";

export type PresenceRow<T> = { key: string; item: T; leaving: boolean; entering: boolean };

const EXIT_DURATION = 220;

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
        const timer = window.setTimeout(() => setRows((current) => current.filter((row) => !row.leaving)), EXIT_DURATION);
        return () => window.clearTimeout(timer);
    }, [leaving]);

    return rows;
}

/** Eases a row's height and opacity in when it is `entering`, and out while it is `leaving`. */
export function Presence({ leaving, entering, children }: { leaving: boolean; entering: boolean; children: ReactNode }) {
    const [entered, setEntered] = useState(!entering);
    useEffect(() => {
        if (entered) return;
        const frame = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(frame);
    }, [entered]);
    return (
        <Collapse open={entered && !leaving} lazy={false}>
            {children}
        </Collapse>
    );
}
