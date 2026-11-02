import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PresenceViewer, RealtimeChannel } from "@rinia/shared";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { realtimeClient } from "./realtime-client";

const NO_VIEWERS: PresenceViewer[] = [];

/** Listens to changes on these channels while the component is mounted. Missing channels are skipped. */
export function useRealtimeChannels(channels: Array<RealtimeChannel | null | undefined>) {
    const key = [...new Set(channels.filter(Boolean))].sort().join(" ");
    useEffect(() => {
        if (!key) return;
        const unsubscribes = key.split(" ").map((channel) => realtimeClient.subscribe(channel as RealtimeChannel));
        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [key]);
}

/**
 * Marks the signed-in user as present on an issue or document, and whether they are editing it, for as long as the
 * page is open. Returns everyone else there.
 */
export function useChannelPresence(channel: RealtimeChannel | null, editing = false): PresenceViewer[] {
    const [page] = useState(() => Symbol("presence"));
    const { user } = useAuth();
    useEffect(() => {
        if (!channel) return;
        const unsubscribe = realtimeClient.subscribe(channel);
        return () => {
            realtimeClient.leavePresence(channel, page);
            unsubscribe();
        };
    }, [channel, page]);
    useEffect(() => {
        if (channel) realtimeClient.setPresence(channel, page, editing);
    }, [channel, page, editing]);
    const viewers = useSyncExternalStore(realtimeClient.watch, () => (channel ? realtimeClient.viewersOf(channel) : NO_VIEWERS));
    return useMemo(() => viewers.filter((viewer) => viewer.user.id !== user?.id), [viewers, user?.id]);
}

export function useRealtimeStatus() {
    return useSyncExternalStore(realtimeClient.watch, () => realtimeClient.status);
}
