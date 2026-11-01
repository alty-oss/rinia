import type { EntityIcon, IssuePriority, NotificationType } from "@rinia/shared";
import type { IssuePerson } from "@/features/issues/api";
import { apiClient } from "@/lib/api-client";

type NotificationStatus = { id: string; name: string; color: string | null };

export interface InboxNotification {
    id: string;
    type: NotificationType;
    readAt: string | null;
    createdAt: string;
    actor: IssuePerson;
    project: { id: string; name: string; issueKey: string; icon: string | null; iconAppearance: EntityIcon | null };
    issue: { id: string; number: number; identifier: string; title: string; columnId: string; priority: IssuePriority };
    /** The start of the comment, for comments and mentions in comments. */
    excerpt: string | null;
    /** The states a state change moved between. Either is null when that state was deleted since. */
    status: { from: NotificationStatus | null; to: NotificationStatus | null } | null;
}

export function listNotifications(): Promise<InboxNotification[]> {
    return apiClient.get<{ notifications: InboxNotification[] }>("/notifications").then((res) => res.notifications);
}

export function getUnreadNotificationCount(): Promise<number> {
    return apiClient.get<{ count: number }>("/notifications/unread-count").then((res) => res.count);
}

export function setNotificationRead(notificationId: string, read: boolean): Promise<void> {
    return apiClient.patch<void>(`/notifications/${notificationId}`, { read });
}

export function markAllNotificationsRead(): Promise<void> {
    return apiClient.post<void>("/notifications/read-all");
}

export function getIssueSubscription(identifier: string): Promise<{ following: boolean }> {
    return apiClient.get<{ subscription: { following: boolean } }>(`/issues/${encodeURIComponent(identifier)}/subscription`).then((res) => res.subscription);
}

export function setIssueSubscription(identifier: string, following: boolean): Promise<{ following: boolean }> {
    const path = `/issues/${encodeURIComponent(identifier)}/subscription`;
    return (following ? apiClient.put<{ subscription: { following: boolean } }>(path) : apiClient.delete<{ subscription: { following: boolean } }>(path)).then((res) => res.subscription);
}
