import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getIssueSubscription, getUnreadNotificationCount, listNotifications, markAllNotificationsRead, setIssueSubscription, setNotificationRead, type InboxNotification } from "../api";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;
export const subscriptionKey = (identifier: string) => ["issues", identifier, "subscription"] as const;

/** How often the sidebar checks for new notifications while the app is open. */
const POLL_INTERVAL = 30_000;

export function useNotifications() {
    return useQuery({ queryKey: [...NOTIFICATIONS_QUERY_KEY, "list"], queryFn: listNotifications, refetchInterval: POLL_INTERVAL });
}

export function useUnreadNotificationCount() {
    return useQuery({ queryKey: UNREAD_COUNT_QUERY_KEY, queryFn: getUnreadNotificationCount, refetchInterval: POLL_INTERVAL });
}

/** Read state flips immediately, in the list and in the unread count; both refresh once the server answers. */
export function useSetNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, read }: { id: string; read: boolean }) => setNotificationRead(id, read),
        onMutate: async ({ id, read }) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            let changed = false;
            queryClient.setQueryData<InboxNotification[]>([...NOTIFICATIONS_QUERY_KEY, "list"], (current) =>
                current?.map((item) => {
                    if (item.id !== id || !!item.readAt === read) return item;
                    changed = true;
                    return { ...item, readAt: read ? new Date().toISOString() : null };
                }),
            );
            if (changed) queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (count) => Math.max(0, (count ?? 0) + (read ? -1 : 1)));
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            const now = new Date().toISOString();
            queryClient.setQueryData<InboxNotification[]>([...NOTIFICATIONS_QUERY_KEY, "list"], (current) => current?.map((item) => (item.readAt ? item : { ...item, readAt: now })));
            queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
    });
}

export function useIssueSubscription(identifier: string | null) {
    return useQuery({ queryKey: subscriptionKey(identifier ?? ""), queryFn: () => getIssueSubscription(identifier!), enabled: !!identifier });
}

export function useToggleIssueSubscription(identifier: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (following: boolean) => setIssueSubscription(identifier, following),
        onMutate: async (following) => {
            await queryClient.cancelQueries({ queryKey: subscriptionKey(identifier) });
            const previous = queryClient.getQueryData<{ following: boolean }>(subscriptionKey(identifier));
            queryClient.setQueryData(subscriptionKey(identifier), { following });
            return { previous };
        },
        onError: (_error, _following, context) => queryClient.setQueryData(subscriptionKey(identifier), context?.previous),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: subscriptionKey(identifier) });
            queryClient.invalidateQueries({ queryKey: ["my-issues"] });
        },
    });
}
