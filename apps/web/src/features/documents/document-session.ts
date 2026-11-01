import type { EntityIcon, UpdateDocumentInput } from "@rinia/shared";
import type { DocumentPage } from "./api";

export type SaveStatus = "saved" | "pending" | "saving" | "offline" | "error" | "deleted";
export interface SessionState {
    title: string;
    iconAppearance: EntityIcon | null;
    revision: number;
    status: SaveStatus;
    dirty: boolean;
    error?: string;
}
interface Dependencies {
    save: (input: UpdateDocumentInput, signal: AbortSignal) => Promise<DocumentPage>;
    online: () => boolean;
    onSaved: (page: DocumentPage) => void;
}

/**
 * Saves a page's title and icon with single-flight requests. The content is not here: it is edited through the
 * collaborative document, which keeps itself in step with the server. The last title saved wins.
 */
export class DocumentSession {
    private state: SessionState;
    private listeners = new Set<() => void>();
    private timer?: ReturnType<typeof setTimeout>;
    private flight?: Promise<void>;
    private controller?: AbortController;
    private generation = 0;
    private changes = 0;
    private lastEditAt = Date.now();
    private suspended = false;

    constructor(
        page: DocumentPage,
        private deps: Dependencies,
    ) {
        this.state = { title: page.title, iconAppearance: page.iconAppearance, revision: page.revision, status: "saved", dirty: false };
    }
    getSnapshot = () => this.state;
    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    private emit(patch: Partial<SessionState>) {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((listener) => listener());
    }
    edit(patch: { title?: string; iconAppearance?: EntityIcon | null }) {
        if (this.suspended || this.state.status === "deleted") return;
        this.changes++;
        this.lastEditAt = Date.now();
        this.emit({ ...patch, dirty: true, error: undefined, status: this.flight ? "saving" : "pending" });
        this.schedule();
    }
    private schedule() {
        clearTimeout(this.timer);
        if (this.suspended) return;
        if (!this.deps.online()) {
            this.emit({ status: "offline" });
            return;
        }
        this.timer = setTimeout(
            () => {
                void this.flush(false);
            },
            Math.max(0, 1000 - (Date.now() - this.lastEditAt)),
        );
    }
    async flush(immediate = true): Promise<void> {
        clearTimeout(this.timer);
        if (this.flight) {
            await this.flight;
            if (this.state.status === "pending") return this.flush(immediate);
            return;
        }
        if (this.suspended || !this.state.dirty || this.state.status === "deleted") return;
        if (!immediate && Date.now() - this.lastEditAt < 1000) {
            this.schedule();
            return;
        }
        if (!this.deps.online()) {
            this.emit({ status: "offline" });
            return;
        }
        const changes = this.changes,
            generation = this.generation;
        const input = { title: this.state.title, iconAppearance: this.state.iconAppearance };
        this.controller = new AbortController();
        this.emit({ status: "saving", error: undefined });
        this.flight = (async () => {
            try {
                const page = await this.deps.save(input, this.controller!.signal);
                if (generation !== this.generation) return;
                this.deps.onSaved(page);
                // Edits made while the request was in flight stay as they are and save next.
                if (changes === this.changes) this.emit({ title: page.title, iconAppearance: page.iconAppearance, revision: page.revision, dirty: false, status: "saved" });
                else this.emit({ revision: page.revision, status: "pending" });
            } catch (error) {
                if (generation !== this.generation) return;
                const status = (error as { status?: number }).status;
                this.emit({
                    status: status === 404 ? "deleted" : !this.deps.online() ? "offline" : "error",
                    error: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "documents.couldNotSave",
                });
            } finally {
                this.flight = undefined;
                if (generation === this.generation && this.state.dirty && this.state.status === "saving") this.emit({ status: "pending" });
                if (this.state.status === "pending" && !this.suspended) this.schedule();
            }
        })();
        await this.flight;
    }
    async pause() {
        this.suspended = true;
        clearTimeout(this.timer);
        this.generation++;
        this.controller?.abort();
        await this.flight;
    }
    resume() {
        this.suspended = false;
        if (this.state.dirty) this.schedule();
    }
    /** A newer title or icon from someone else replaces this one, unless this tab is in the middle of changing it. */
    observe(page: DocumentPage) {
        if (this.suspended || this.flight || this.state.dirty || page.revision <= this.state.revision) return;
        this.emit({ title: page.title, iconAppearance: page.iconAppearance, revision: page.revision, status: "saved" });
    }
    networkChanged() {
        if (!this.suspended && this.state.dirty && this.state.status !== "deleted") this.schedule();
    }
}
