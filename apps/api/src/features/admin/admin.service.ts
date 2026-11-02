import { boardColumns, categories, issueActivities, issueComments, issueRelations, issues, projectMembers, projectDocuments, projects, users } from "../../db/schema";
import { db } from "../../db";

export interface DatabaseBackup {
    version: 6;
    exportedAt: string;
    tables: {
        users: (typeof users.$inferSelect)[];
        projects: (typeof projects.$inferSelect)[];
        projectMembers: (typeof projectMembers.$inferSelect)[];
        boardColumns: (typeof boardColumns.$inferSelect)[];
        categories: (typeof categories.$inferSelect)[];
        issues: (typeof issues.$inferSelect)[];
        comments: (typeof issueComments.$inferSelect)[];
        activities: (typeof issueActivities.$inferSelect)[];
        relations: (typeof issueRelations.$inferSelect)[];
        /** `yjsState` is base64. */
        documents: (Omit<typeof projectDocuments.$inferSelect, "yjsState"> & { yjsState: string | null })[];
    };
}

export async function createBackup(): Promise<DatabaseBackup> {
    const [usersRows, projectsRows, projectMembersRows, boardColumnsRows, categoriesRows, issuesRows, commentsRows, activitiesRows, relationsRows, documentsRows] = await Promise.all([
        db.select().from(users),
        db.select().from(projects),
        db.select().from(projectMembers),
        db.select().from(boardColumns),
        db.select().from(categories),
        db.select().from(issues),
        db.select().from(issueComments),
        db.select().from(issueActivities),
        db.select().from(issueRelations),
        db.select().from(projectDocuments),
    ]);

    return {
        version: 6,
        exportedAt: new Date().toISOString(),
        tables: {
            users: usersRows,
            projects: projectsRows,
            projectMembers: projectMembersRows,
            boardColumns: boardColumnsRows,
            categories: categoriesRows,
            issues: issuesRows,
            comments: commentsRows,
            activities: activitiesRows,
            relations: relationsRows,
            // The Yjs state is kept: rebuilt from the JSON, every block would get a new identity, and a browser still
            // holding its offline copy of the page would merge the old blocks back in, doubling the page.
            documents: documentsRows.map((row) => ({ ...row, yjsState: row.yjsState && Buffer.from(row.yjsState).toString("base64") })),
        },
    };
}
