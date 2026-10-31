import { asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Locale } from "@rinia/shared";
import { DEFAULT_COLUMNS, LEGACY_DEFAULT_COLUMNS } from "../features/projects/default-columns";
import { boardColumns } from "./schema/board-columns";

type Column = typeof boardColumns.$inferSelect;

/**
 * TEMPORARY: remove this file (and its call in migrate.ts) once the projects created before the new default
 * workflow have been upgraded in production.
 *
 * A project that still has the three old default columns gets the rest of the current workflow (backlog, in
 * review, canceled), each right after the default column before it. It runs on every startup, so it skips a
 * project that already has any of the new columns: deleting one afterwards does not bring it back.
 */
export async function upgradeDefaultColumns(db: NodePgDatabase) {
    const rows = await db.select().from(boardColumns).orderBy(asc(boardColumns.position));
    const byProject = new Map<string, Column[]>();
    for (const row of rows) byProject.set(row.projectId, [...(byProject.get(row.projectId) ?? []), row]);

    let upgraded = 0;
    for (const [projectId, columns] of byProject) {
        const has = (name: string) => columns.some((column) => column.name.toLowerCase() === name.toLowerCase());
        const locale = (Object.keys(LEGACY_DEFAULT_COLUMNS) as Locale[]).find((candidate) => LEGACY_DEFAULT_COLUMNS[candidate].every(has));
        if (!locale) continue;
        const workflow = DEFAULT_COLUMNS[locale];
        const added = workflow.filter((column) => !LEGACY_DEFAULT_COLUMNS[locale].includes(column.name));
        if (added.some((column) => has(column.name))) continue;

        for (const column of added) {
            // The nearest default column before this one in the workflow; the backlog has none, so it goes first.
            const index = workflow.indexOf(column);
            const anchor = workflow.slice(0, index).reverse().find((entry) => has(entry.name));
            const at = anchor ? columns.findIndex((existing) => existing.name.toLowerCase() === anchor.name.toLowerCase()) + 1 : 0;
            const before = columns[at - 1];
            const after = columns[at];
            const position = !before ? (after ? after.position / 2 : 1000) : !after ? before.position + 1000 : (before.position + after.position) / 2;
            const [inserted] = await db.insert(boardColumns).values({ projectId, name: column.name, color: column.color, position }).returning();
            columns.splice(at, 0, inserted);
        }
        upgraded++;
    }

    if (upgraded > 0) console.log(`Added the new default columns to ${upgraded} project(s)`);
}
