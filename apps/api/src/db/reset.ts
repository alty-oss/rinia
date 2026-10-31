import { Pool } from "pg";
import { assertDevelopmentDatabase } from "./dev-guard";

/** Drops every table and the migration journal. `bun run db:reset` then migrates and seeds again. */
async function main() {
    assertDevelopmentDatabase("reset the database");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await pool.end();
    console.log("Database dropped");
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
