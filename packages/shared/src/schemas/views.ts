import { z } from "zod";
import { issueOrderValues, issuePriorityValues, MAX_ISSUE_LABELS } from "./issues";

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

/** The scopes the issue list can show. Saved views keep the one the page was on. */
export const savedViewScopeValues = ["active", "backlog", "all"] as const;
export const savedViewGroupValues = ["none", "status", "assignee"] as const;
export const savedViewDueValues = ["overdue", "thisWeek"] as const;

const labelFilterSchema = z
    .string()
    .max(MAX_ISSUE_LABELS * 37)
    .refine((value) => {
        const ids = value.split(",");
        return ids.length <= MAX_ISSUE_LABELS && ids.every((id) => z.string().uuid().safeParse(id).success);
    }, "Use a comma-separated list of label ids");

/**
 * The issue-page URL parameters a saved view reproduces. Values mirror the query string, so opening a view
 * means putting these back in the URL. A missing key is that parameter's default.
 */
export const savedViewFiltersSchema = z
    .object({
        q: z.string().max(200).optional(),
        priority: z.enum(issuePriorityValues).optional(),
        status: z.string().uuid().optional(),
        assignee: z.string().uuid().optional(),
        label: labelFilterSchema.optional(),
        due: z.enum(savedViewDueValues).optional(),
        group: z.enum(savedViewGroupValues).optional(),
        order: z.enum(issueOrderValues).optional(),
        view: issueViewSchema.optional(),
        scope: z.enum(savedViewScopeValues).optional(),
    })
    .strict();
export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;
export const savedViewFilterKeys = Object.keys(savedViewFiltersSchema.shape) as Array<keyof SavedViewFilters>;

const viewNameSchema = z.string().trim().min(1).max(80);

export const createViewSchema = z
    .object({
        name: viewNameSchema,
        shared: z.boolean().default(false),
        filters: savedViewFiltersSchema,
    })
    .strict();
export type CreateViewInput = z.infer<typeof createViewSchema>;

export const updateViewSchema = z
    .object({
        name: viewNameSchema.optional(),
        shared: z.boolean().optional(),
        filters: savedViewFiltersSchema.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, "Nothing to update");
export type UpdateViewInput = z.infer<typeof updateViewSchema>;

export const duplicateViewSchema = z.object({ name: viewNameSchema.optional() }).strict();
export type DuplicateViewInput = z.infer<typeof duplicateViewSchema>;
