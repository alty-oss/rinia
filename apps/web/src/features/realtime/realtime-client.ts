import { PRESENCE_HEARTBEAT_MS, REALTIME_PATH, type PresenceViewer, type RealtimeChannel, type RealtimeClientMessage, type RealtimeEvent, type RealtimeServerMessage } from "@rinia/shared";
import { fromBase64, toBase64 } from "@/lib/base64";
/** `connecting` covers the first attempt and every retry; `offline` is a socket that dropped and has not come back yet. */
export type RealtimeStatus = "idle" | "connecting" | "open" | "offline";

const RETRY_BASE_MS = 500;
const RETRY_MAX_MS = 15_000;
/** The browser cannot see a half-open socket, so it asks the server every so often and gives up when no answer comes. */
const PING_EVERY_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const NO_VIEWERS: PresenceViewer[] = [];

/** A page being edited together listens to its channel through this, and sends its Yjs messages back over it. */
export interface DocumentChannelHandler {
    /** The server confirmed the subscription, on the first connection and after every reconnect: time to sync. */
    attached(): void;
    /** The socket dropped. */
    detached(): void;
    /** The server refused the channel, or could not open the page. */
    denied(): void;
    message(bytes: Uint8Array): void;
}

interface Listeners {
    event: (event: RealtimeEvent) => void;
    /** The socket came back after a drop: anything could have changed in between. */
    resync: () => void;
    /** The server closed the socket because the session is no longer valid. */
    unauthorized: () => void;
}

/**
 * One WebSocket per tab, shared by every page. Channels are reference counted, so two components on the same issue
 * keep one subscription; presence is sent again every `PRESENCE_HEARTBEAT_MS` while a page stays open.
 */
export class RealtimeClient {
    private socket?: WebSocket;
    private wanted = false;
    private opened = false;
    private attempt = 0;
    private retryTimer?: ReturnType<typeof setTimeout>;
    private pingTimer?: ReturnType<typeof setInterval>;
    private pongTimer?: ReturnType<typeof setTimeout>;
    private heartbeatTimer?: ReturnType<typeof setInterval>;
    private channels = new Map<RealtimeChannel, number>();
    /** Each page on a channel says whether it is editing; the tab is editing when any of them is. */
    private presence = new Map<RealtimeChannel, Map<symbol, boolean>>();
    private viewers = new Map<RealtimeChannel, PresenceViewer[]>();
    private documents = new Map<RealtimeChannel, DocumentChannelHandler>();
    /** Channels the server confirmed on this socket, so a page opening on a channel someone else already joined can sync at once. */
    private confirmed = new Set<RealtimeChannel>();
    private listeners: { [K in keyof Listeners]: Set<Listeners[K]> } = { event: new Set(), resync: new Set(), unauthorized: new Set() };
    private watchers = new Set<() => void>();
    status: RealtimeStatus = "idle";

    constructor(private url: () => string) {}

    start() {
        if (this.wanted) return;
        this.wanted = true;
        window.addEventListener("online", this.reconnectNow);
        document.addEventListener("visibilitychange", this.onVisibility);
        this.heartbeatTimer = setInterval(() => this.sendPresence(), PRESENCE_HEARTBEAT_MS);
        this.connect();
    }

    stop() {
        this.wanted = false;
        this.opened = false;
        window.removeEventListener("online", this.reconnectNow);
        document.removeEventListener("visibilitychange", this.onVisibility);
        clearInterval(this.heartbeatTimer);
        clearTimeout(this.retryTimer);
        this.teardown();
        this.socket?.close(1000);
        this.socket = undefined;
        this.viewers.clear();
        this.detachDocuments();
        this.setStatus("idle");
    }

    on<K extends keyof Listeners>(kind: K, listener: Listeners[K]) {
        this.listeners[kind].add(listener);
        return () => void this.listeners[kind].delete(listener);
    }

    /** For `useSyncExternalStore`: fires when the status or someone's presence changes. */
    watch = (listener: () => void) => {
        this.watchers.add(listener);
        return () => void this.watchers.delete(listener);
    };

    viewersOf(channel: RealtimeChannel) {
        return this.viewers.get(channel) ?? NO_VIEWERS;
    }

    subscribe(channel: RealtimeChannel) {
        const count = this.channels.get(channel) ?? 0;
        this.channels.set(channel, count + 1);
        if (count === 0) this.send({ type: "subscribe", channel });
        return () => {
            const left = (this.channels.get(channel) ?? 1) - 1;
            if (left > 0) return void this.channels.set(channel, left);
            this.channels.delete(channel);
            this.viewers.delete(channel);
            this.confirmed.delete(channel);
            this.send({ type: "unsubscribe", channel });
            this.notify();
        };
    }

    /** Listens to a page's Yjs messages. The channel is subscribed like any other, so it also counts for presence. */
    attachDocument(channel: RealtimeChannel, handler: DocumentChannelHandler) {
        this.documents.set(channel, handler);
        const unsubscribe = this.subscribe(channel);
        if (this.confirmed.has(channel)) queueMicrotask(() => this.documents.get(channel) === handler && handler.attached());
        return () => {
            if (this.documents.get(channel) === handler) this.documents.delete(channel);
            unsubscribe();
        };
    }

    /**
     * Sends a Yjs message for a page. False when the socket is not open, in which case the next sync carries it. It does
     * not wait for the subscription to be confirmed: the server asks for what this tab has before it says "subscribed".
     */
    sendDocument(channel: RealtimeChannel, bytes: Uint8Array) {
        if (this.socket?.readyState !== WebSocket.OPEN || this.status !== "open") return false;
        this.send({ type: "doc", channel, data: toBase64(bytes) });
        return true;
    }

    /** Joins the channel's presence, or updates whether this page is editing. Subscribe to the channel first. */
    setPresence(channel: RealtimeChannel, page: symbol, editing: boolean) {
        let pages = this.presence.get(channel);
        if (!pages) this.presence.set(channel, (pages = new Map()));
        const before = [...pages.values()].some(Boolean);
        const joined = !pages.has(page);
        pages.set(page, editing);
        const after = [...pages.values()].some(Boolean);
        if (joined || before !== after) this.send({ type: "presence", channel, editing: after });
    }

    leavePresence(channel: RealtimeChannel, page: symbol) {
        const pages = this.presence.get(channel);
        if (!pages?.delete(page)) return;
        if (pages.size > 0) return this.send({ type: "presence", channel, editing: [...pages.values()].some(Boolean) });
        this.presence.delete(channel);
        this.send({ type: "leave", channel });
    }

    private connect() {
        if (!this.wanted || this.socket) return;
        if (!navigator.onLine) return this.setStatus(this.opened ? "offline" : "connecting");
        this.setStatus(this.opened ? "offline" : "connecting");
        const socket = new WebSocket(this.url());
        this.socket = socket;
        socket.onmessage = (message) => {
            if (this.socket !== socket) return;
            try {
                this.receive(JSON.parse(String(message.data)) as RealtimeServerMessage);
            } catch {
                /* Ignore anything that is not a server message. */
            }
        };
        socket.onclose = (event) => {
            if (this.socket !== socket) return;
            this.socket = undefined;
            this.teardown();
            // Presence from before the drop is stale; it comes back with the next subscription.
            this.viewers.clear();
            this.detachDocuments();
            if (event.code === 4401) this.listeners.unauthorized.forEach((listener) => listener());
            if (!this.wanted) return;
            this.setStatus(this.opened ? "offline" : "connecting");
            this.retry();
        };
    }

    private receive(message: RealtimeServerMessage) {
        if (message.type === "ready") {
            const reconnected = this.opened;
            this.opened = true;
            this.attempt = 0;
            this.setStatus("open");
            for (const channel of this.channels.keys()) this.send({ type: "subscribe", channel });
            this.sendPresence();
            this.startPing();
            if (reconnected) this.listeners.resync.forEach((listener) => listener());
        } else if (message.type === "event") {
            this.listeners.event.forEach((listener) => listener(message.event));
        } else if (message.type === "presence") {
            if (!this.channels.has(message.channel)) return;
            this.viewers.set(message.channel, message.viewers);
            this.notify();
        } else if (message.type === "subscribed") {
            this.confirmed.add(message.channel);
            this.documents.get(message.channel)?.attached();
        } else if (message.type === "doc") {
            this.documents.get(message.channel)?.message(fromBase64(message.data));
        } else if (message.type === "denied") {
            this.viewers.delete(message.channel);
            this.confirmed.delete(message.channel);
            this.documents.get(message.channel)?.denied();
            this.notify();
        } else if (message.type === "pong") {
            clearTimeout(this.pongTimer);
        }
    }

    private send(message: RealtimeClientMessage) {
        // Closed sockets drop messages; `ready` resends every subscription and presence after reconnecting.
        if (this.socket?.readyState === WebSocket.OPEN && this.status === "open") this.socket.send(JSON.stringify(message));
    }

    private sendPresence() {
        for (const [channel, pages] of this.presence) this.send({ type: "presence", channel, editing: [...pages.values()].some(Boolean) });
    }

    private startPing() {
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
            this.send({ type: "ping" });
            clearTimeout(this.pongTimer);
            this.pongTimer = setTimeout(() => this.socket?.close(4000, "No pong"), PONG_TIMEOUT_MS);
        }, PING_EVERY_MS);
    }

    private detachDocuments() {
        this.confirmed.clear();
        this.documents.forEach((handler) => handler.detached());
    }

    private teardown() {
        clearInterval(this.pingTimer);
        clearTimeout(this.pongTimer);
    }

    /** Waits longer after each failure, with jitter so a restarted server is not hit by every tab at once. */
    private retry() {
        clearTimeout(this.retryTimer);
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** this.attempt) * (0.5 + Math.random() / 2);
        this.attempt++;
        this.retryTimer = setTimeout(() => this.connect(), delay);
    }

    private reconnectNow = () => {
        if (!this.wanted || this.socket) return;
        clearTimeout(this.retryTimer);
        this.attempt = 0;
        this.connect();
    };

    /** A tab coming back to the front renews presence at once, since background tabs may run timers late. */
    private onVisibility = () => {
        if (document.visibilityState !== "visible") return;
        if (this.socket) this.sendPresence();
        else this.reconnectNow();
    };

    private setStatus(status: RealtimeStatus) {
        if (this.status === status) return;
        this.status = status;
        this.notify();
    }

    private notify() {
        this.watchers.forEach((listener) => listener());
    }
}

export const realtimeClient = new RealtimeClient(() => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${REALTIME_PATH}`);
