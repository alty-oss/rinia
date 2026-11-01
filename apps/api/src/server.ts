import { app } from "./app";
import { env } from "./config/env";
import { cleanupExpiredDeletes } from "./db/soft-delete-cleanup";

const cleanup = () => void cleanupExpiredDeletes().catch((error) => console.error("Could not clean expired undo records", error));
cleanup();
setInterval(cleanup, 60_000).unref();

app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
});
