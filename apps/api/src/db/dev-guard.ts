const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

/**
 * Stops seed and reset scripts outside development. They write fixed accounts with a known password,
 * and reset drops every table, so both refuse production and any database that is not on this machine.
 */
export function assertDevelopmentDatabase(task: string) {
    if (process.env.NODE_ENV === "production") {
        throw new Error(`Refusing to ${task}: NODE_ENV is "production".`);
    }

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error(`Refusing to ${task}: DATABASE_URL is not set.`);

    const host = new URL(url).hostname;
    if (!LOCAL_HOSTS.has(host)) {
        throw new Error(`Refusing to ${task}: DATABASE_URL points to "${host}", not a local database.`);
    }
}
