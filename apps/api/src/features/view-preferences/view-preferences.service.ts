import { defaultIssueView, issueViewSchema, type IssueView } from "@rinia/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { projectViewPreferences } from "../../db/schema";

/** The user's saved view for a project, or the default when nothing (or a view that no longer exists) is saved. */
export async function getViewPreference(userId: string, projectId: string) {
    const row = await db.query.projectViewPreferences.findFirst({
        where: and(eq(projectViewPreferences.userId, userId), eq(projectViewPreferences.projectId, projectId)),
        columns: { issueView: true },
    });
    const issueView = issueViewSchema.safeParse(row?.issueView);
    return { issueView: issueView.success ? issueView.data : defaultIssueView };
}

export async function saveViewPreference(userId: string, projectId: string, issueView: IssueView) {
    await db
        .insert(projectViewPreferences)
        .values({ userId, projectId, issueView })
        .onConflictDoUpdate({
            target: [projectViewPreferences.userId, projectViewPreferences.projectId],
            set: { issueView, updatedAt: new Date() },
        });
    return { issueView };
}
