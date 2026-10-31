import { issueViewSchema, issueViewValues, type IssueView } from "@rinia/shared";
import type { ParseKeys } from "i18next";
import { LayoutGrid, List, type LucideIcon } from "lucide-react";

/**
 * How each issue view shows up in the view switch, in `issueViewValues` order. Adding a view means adding
 * it to `issueViewValues` in @rinia/shared, giving it an entry here (the type requires one), and rendering
 * it in `ProjectIssuesPage`.
 */
const issueViewOptions: Record<IssueView, { icon: LucideIcon; label: ParseKeys }> = {
    list: { icon: List, label: "issue.list" },
    board: { icon: LayoutGrid, label: "projects.board" },
};

export const issueViews = issueViewValues.map((value) => ({ value, ...issueViewOptions[value] }));

/** A `?view=` value from a link, or null when it is missing or names a view that does not exist. */
export function readIssueView(value: string | null): IssueView | null {
    const parsed = issueViewSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}
