import { z } from "zod";

/**
 * The ways a project's issues can be shown. To add one, append it here and register it in
 * `apps/web/src/features/issues/views.ts`. The saved preference is plain text, so a new view needs no migration.
 */
export const issueViewValues = ["list", "board"] as const;
export type IssueView = (typeof issueViewValues)[number];
export const issueViewSchema = z.enum(issueViewValues);
export const defaultIssueView: IssueView = "list";

/** A user's saved view settings for one project. More settings (grouping, ordering) can join `issueView` here. */
export const updateViewPreferenceSchema = z.object({ issueView: issueViewSchema }).strict();
export type UpdateViewPreferenceInput = z.infer<typeof updateViewPreferenceSchema>;
