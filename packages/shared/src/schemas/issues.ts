import { z } from "zod";

export const tiptapNodeSchema = z.record(z.unknown());
export const tiptapDocumentSchema = z.object({
    type: z.literal("doc"),
    content: z.array(tiptapNodeSchema).default([]),
});
export type TiptapDocument = z.infer<typeof tiptapDocumentSchema>;

/** Linear's five levels. "none" is the default for new issues. */
export const issuePriorityValues = ["none", "low", "medium", "high", "urgent"] as const;
export type IssuePriority = (typeof issuePriorityValues)[number];
export const issueRelationValues = ["blocks", "blocked_by", "related", "duplicate"] as const;
export const issueEstimateValues = [1, 2, 3, 5, 8] as const;
/** A calendar day, `YYYY-MM-DD`, with no time or zone: an issue is due on a day, wherever its people are. */
export const dueDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
    .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    }, "Use a real calendar date");
export const issueOrderValues = ["position", "priority", "updated", "number", "due"] as const;
export type IssueOrder = (typeof issueOrderValues)[number];
const estimateSchema = z.number().int().refine((value) => issueEstimateValues.includes(value as (typeof issueEstimateValues)[number]), "Estimate must be 1, 2, 3, 5, or 8");

export const createIssueSchema = z.object({
    columnId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    descriptionJson: tiptapDocumentSchema.optional(),
    categoryId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    priority: z.enum(issuePriorityValues).default("none"),
    parentIssueId: z.string().uuid().nullable().optional(),
    estimate: estimateSchema.nullable().optional(),
    dueDate: dueDateSchema.nullable().optional(),
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        descriptionJson: tiptapDocumentSchema.optional(),
        expectedDescriptionRevision: z.number().int().nonnegative().optional(),
        columnId: z.string().uuid().optional(),
        position: z.number().finite().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        assigneeId: z.string().uuid().nullable().optional(),
        priority: z.enum(issuePriorityValues).optional(),
        parentIssueId: z.string().uuid().nullable().optional(),
        estimate: estimateSchema.nullable().optional(),
        dueDate: dueDateSchema.nullable().optional(),
    })
    .strict()
    .superRefine((value, context) => {
        if (value.descriptionJson !== undefined && value.expectedDescriptionRevision === undefined) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedDescriptionRevision"], message: "Expected description revision is required" });
        }
        if (value.descriptionJson === undefined && value.expectedDescriptionRevision !== undefined) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedDescriptionRevision"], message: "Description revision requires a description update" });
        }
    });
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export const issueListQuerySchema = z.object({
    columnId: z.string().uuid().optional(),
    priority: z.enum(issuePriorityValues).optional(),
    assigneeId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    groupBy: z.enum(["status", "assignee"]).optional(),
    orderBy: z.enum(issueOrderValues).default("position"),
});
export type IssueListQuery = z.infer<typeof issueListQuerySchema>;

export const createIssueCommentSchema = z.object({ contentJson: tiptapDocumentSchema });
export const updateIssueCommentSchema = createIssueCommentSchema;
export type CreateIssueCommentInput = z.infer<typeof createIssueCommentSchema>;
export type UpdateIssueCommentInput = z.infer<typeof updateIssueCommentSchema>;

/** A single emoji, flags and skin tones included, and nothing else. */
export const reactionEmojiSchema = z
    .string()
    .trim()
    .min(1)
    .max(32)
    .refine((value) => /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u.test(value) && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value) && [...new Intl.Segmenter().segment(value)].length === 1, "Use a single emoji");
export const commentReactionSchema = z.object({ emoji: reactionEmojiSchema }).strict();
export type CommentReactionInput = z.infer<typeof commentReactionSchema>;

export const createIssueRelationSchema = z.object({
    targetIssueIdentifier: z.string().trim().min(3).max(32),
    type: z.enum(issueRelationValues),
});
export type CreateIssueRelationInput = z.infer<typeof createIssueRelationSchema>;

export const updateProjectDocumentSchema = z.object({ contentJson: tiptapDocumentSchema });
export type UpdateProjectDocumentInput = z.infer<typeof updateProjectDocumentSchema>;
