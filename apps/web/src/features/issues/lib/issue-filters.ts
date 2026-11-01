import type { IssueOrder } from "@rinia/shared";
import type { Issue } from "../api";
import { matchesDueFilter } from "./due-date";

/** `isClosed` tells which issues sit in a closed state, which are never overdue. */
export function filterIssues(issues: Issue[], query: URLSearchParams, isClosed: (issue: Issue) => boolean = () => false) {
    const search = (query.get("q") ?? "").toLowerCase();
    return issues.filter(
        (issue) =>
            (!search || `${issue.identifier} ${issue.title}`.toLowerCase().includes(search)) &&
            (!query.get("priority") || issue.priority === query.get("priority")) &&
            (!query.get("status") || issue.columnId === query.get("status")) &&
            (!query.get("assignee") || issue.assigneeId === query.get("assignee")) &&
            matchesLabels(issue.categoryIds, readLabels(query.get("label"))) &&
            matchesDueFilter(issue.dueDate, query.get("due") ?? "", isClosed(issue)),
    );
}
/** The `label` filter holds several ids, comma-separated. */
export function readLabels(value: string | null) {
    return value ? value.split(",").filter(Boolean) : [];
}

/** An issue matches a label filter when it has any of the chosen labels. */
export function matchesLabels(issueLabels: string[], wanted: string[]) {
    return wanted.length === 0 || wanted.some((id) => issueLabels.includes(id));
}

export function readIssueOrder(value: string | null): IssueOrder {
    return value === "priority" || value === "updated" || value === "number" || value === "due" ? value : "position";
}
