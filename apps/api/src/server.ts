import { app } from "./app";
import { env } from "./config/env";
import { cleanupExpiredDeletes } from "./db/soft-delete-cleanup";
import { documentRooms } from "./features/documents/document-rooms";
import { attachRealtime } from "./features/realtime/realtime.socket";

const cleanup = () => void cleanupExpiredDeletes().catch((error) => console.error("Could not clean expired undo records", error));
cleanup();
setInterval(cleanup, 60_000).unref();

const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
});
attachRealtime(server);

// Pages being edited are saved a moment after each edit; on shutdown the last moment is saved too.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => void documentRooms.closeAll().finally(() => process.exit(0)));
}
