const inbox = {
        title: "Inbox", all: "All", unread: "Unread", filter: "Show",
        markAllRead: "Mark all as read", markRead: "Mark as read", markUnread: "Mark as unread",
        assigned: "{{actor}} assigned you", mentioned: "{{actor}} mentioned you", commented: "{{actor}} commented",
        statusChanged: "{{actor}} moved it to {{status}}", statusChangedUnknown: "{{actor}} changed its state",
        emptyTitle: "You're all caught up", empty: "When someone assigns you an issue, mentions you, or updates an issue you follow, it shows up here.",
        emptyUnreadTitle: "No unread notifications", emptyUnread: "Everything here has been read.", showAll: "Show all",
        couldNotLoad: "Could not load your inbox.", unreadNotifications: "{{count}} unread notifications",
        follow: "Follow issue", unfollow: "Unfollow issue",
        followHint: "Get notified about comments and state changes", unfollowHint: "Stop getting notified about comments and state changes",
    } as const;

export default inbox;
