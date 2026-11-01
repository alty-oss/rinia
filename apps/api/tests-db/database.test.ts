import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, spyOn, test } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Runs against a real PostgreSQL server. Set TEST_DATABASE_URL to a local server where this user may create
 * databases, for example postgres://postgres:postgres@localhost:5432/postgres. Each run creates a database of
 * its own, works only inside it, and drops it at the end; without the variable these tests are skipped.
 */
const adminUrl = process.env.TEST_DATABASE_URL;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (adminUrl && !LOCAL_HOSTS.has(new URL(adminUrl).hostname)) throw new Error("TEST_DATABASE_URL must point to a local server");

const MIGRATIONS = path.resolve(import.meta.dir, "../drizzle");
const LABELS_MIGRATION = 23;
const databaseName = `rinia_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const testUrl = adminUrl ? Object.assign(new URL(adminUrl), { pathname: `/${databaseName}` }).toString() : "";
const admin = adminUrl ? new Pool({ connectionString: adminUrl }) : null;
const direct = adminUrl ? new Pool({ connectionString: testUrl }) : null;

if (admin) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    // The app's database module reads DATABASE_URL when first imported, which happens below.
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET ??= "test-secret";
    process.env.SPECIAL_REGISTRATION_CODE ??= "test-code";
}

afterAll(async () => {
    if (!admin || !direct) return;
    await direct.end();
    const { db } = await import("../src/db");
    await (db.$client as Pool).end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
});

/** A copy of the migrations folder that stops before `idx`, to rebuild the schema as it was. */
function migrationsBefore(idx: number) {
    const folder = mkdtempSync(path.join(tmpdir(), "rinia-migrations-"));
    cpSync(MIGRATIONS, folder, { recursive: true });
    const journalPath = path.join(folder, "meta/_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: Array<{ idx: number }> };
    journal.entries = journal.entries.filter((entry) => entry.idx < idx);
    writeFileSync(journalPath, JSON.stringify(journal));
    return folder;
}

const ids = {
    user: "6a4b8c02-0000-4000-8000-000000000001",
    project: "6a4b8c02-0000-4000-8000-000000000002",
    column: "6a4b8c02-0000-4000-8000-000000000003",
    bug: "6a4b8c02-0000-4000-8000-000000000004",
    design: "6a4b8c02-0000-4000-8000-000000000005",
    first: "6a4b8c02-0000-4000-8000-000000000011",
    second: "6a4b8c02-0000-4000-8000-000000000012",
    third: "6a4b8c02-0000-4000-8000-000000000013",
};

describe.skipIf(!adminUrl)("against PostgreSQL", () => {
    test("the labels migration keeps every existing label and removes the old column", async () => {
        const database = drizzle(direct!);
        const before = migrationsBefore(LABELS_MIGRATION);
        try {
            await migrate(database, { migrationsFolder: before });
        } finally {
            rmSync(before, { recursive: true, force: true });
        }

        await direct!.query(`INSERT INTO users (id, name, username, email, password_hash) VALUES ($1, 'Ana', 'ana', 'ana@test.local', 'x')`, [ids.user]);
        await direct!.query(`INSERT INTO projects (id, name, issue_key, created_by) VALUES ($1, 'Rinia', 'RIN', $2)`, [ids.project, ids.user]);
        await direct!.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`, [ids.project, ids.user]);
        await direct!.query(`INSERT INTO board_columns (id, project_id, name, position) VALUES ($1, $2, 'To do', 1000)`, [ids.column, ids.project]);
        await direct!.query(`INSERT INTO categories (id, project_id, name, created_by) VALUES ($1, $3, 'Bug', $4), ($2, $3, 'Design', $4)`, [ids.bug, ids.design, ids.project, ids.user]);
        await direct!.query(
            `INSERT INTO issues (id, project_id, number, column_id, title, description_json, created_by, position, category_id) VALUES
                ($1, $4, 1, $5, 'First', '{"type":"doc","content":[]}', $6, 1000, $7),
                ($2, $4, 2, $5, 'Second', '{"type":"doc","content":[]}', $6, 2000, $8),
                ($3, $4, 3, $5, 'Third', '{"type":"doc","content":[]}', $6, 3000, NULL)`,
            [ids.first, ids.second, ids.third, ids.project, ids.column, ids.user, ids.bug, ids.design],
        );

        await migrate(database, { migrationsFolder: MIGRATIONS });

        const { rows: labels } = await direct!.query(`SELECT issue_id, category_id FROM issue_labels ORDER BY issue_id`);
        assert.deepEqual(labels, [
            { issue_id: ids.first, category_id: ids.bug },
            { issue_id: ids.second, category_id: ids.design },
        ]);
        const { rows: columns } = await direct!.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'category_id'`);
        assert.equal(columns.length, 0);
        const { rows: types } = await direct!.query(`SELECT unnest(enum_range(NULL::issue_activity_type))::text AS type`);
        assert.ok(types.some((row) => row.type === "label_added") && types.some((row) => row.type === "label_removed"));
    });

    test("a bulk change applies to every issue, or to none when a write fails", async () => {
        const { db } = await import("../src/db");
        const { issueActivities } = await import("../src/db/schema");
        const { bulkUpdateIssues } = await import("../src/features/issues/issues.service");
        // Never touch anything but the throwaway database.
        const { rows: [{ name }] } = await (db.$client as Pool).query<{ name: string }>("SELECT current_database() AS name");
        assert.equal(name, databaseName);

        const issueIds = [ids.first, ids.second, ids.third];
        await bulkUpdateIssues(ids.project, { issueIds, patch: { priority: "high", addCategoryIds: [ids.design] } }, ids.user);
        const state = async () =>
            (await direct!.query(
                `SELECT i.id, i.priority, coalesce(array_agg(l.category_id ORDER BY l.category_id) FILTER (WHERE l.category_id IS NOT NULL), '{}') AS labels
                 FROM issues i LEFT JOIN issue_labels l ON l.issue_id = i.id GROUP BY i.id ORDER BY i.id`,
            )).rows;
        const saved = await state();
        assert.deepEqual(saved.map((row) => row.priority), ["high", "high", "high"]);
        assert.deepEqual(saved.map((row) => row.labels), [[ids.bug, ids.design], [ids.design], [ids.design]]);
        const { rows: [{ count }] } = await direct!.query(`SELECT count(*)::int FROM issue_activities WHERE type IN ('priority_changed', 'label_added')`);
        assert.equal(count, 5, "three priority changes and two labels added; the issue that had the label records nothing for it");

        // Make the activity insert fail after the issues and labels were already written inside the transaction.
        const transaction = db.transaction.bind(db);
        const spy = spyOn(db, "transaction").mockImplementation(((work: (tx: unknown) => Promise<unknown>) =>
            transaction((tx) =>
                work(new Proxy(tx, {
                    get(target, property) {
                        if (property === "insert") return (table: unknown) => {
                            if (table === issueActivities) throw new Error("activity write failed");
                            return target.insert(table as never);
                        };
                        const value = Reflect.get(target, property, target);
                        return typeof value === "function" ? value.bind(target) : value;
                    },
                })),
            )) as never);
        await assert.rejects(bulkUpdateIssues(ids.project, { issueIds, patch: { priority: "urgent", removeCategoryIds: [ids.design] } }, ids.user), /activity write failed/);
        spy.mockRestore();
        assert.deepEqual(await state(), saved, "nothing from the failed change was kept");
    });
});
