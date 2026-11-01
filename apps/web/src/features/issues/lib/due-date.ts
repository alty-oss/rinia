/**
 * Due dates are calendar days (`YYYY-MM-DD`) with no time zone. "Today" is the viewer's own day, so an issue due
 * today turns overdue at the viewer's midnight. Days compare as strings because the format sorts like the calendar.
 */

export type DueState = "overdue" | "today" | "upcoming";
export const dueFilterValues = ["overdue", "thisWeek"] as const;
export type DueFilter = (typeof dueFilterValues)[number];

const pad = (value: number) => String(value).padStart(2, "0");

/** The viewer's day for `date`, as `YYYY-MM-DD`. */
export function localDay(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day as a local Date at midnight, for calendars and formatting. */
export function dayToDate(day: string) {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year, month - 1, date);
}

export function addDays(day: string, days: number) {
    const date = dayToDate(day);
    date.setDate(date.getDate() + days);
    return localDay(date);
}

/** The Saturday that ends the current week. Weeks run Sunday to Saturday, like the calendar's rows. */
function endOfWeek(today = localDay()) {
    return addDays(today, 6 - dayToDate(today).getDay());
}

/** The same weekday next week. */
export function nextWeek(today = localDay()) {
    return addDays(today, 7);
}

/** Whether a due date needs attention. Closed issues are done with their dates, so they never show as late. */
export function dueState(dueDate: string | null | undefined, closed = false): DueState | null {
    if (!dueDate || closed) return null;
    const today = localDay();
    if (dueDate < today) return "overdue";
    if (dueDate === today) return "today";
    return "upcoming";
}

/** "Overdue" covers open issues past their date; "this week" runs from today to Saturday. */
export function matchesDueFilter(dueDate: string | null | undefined, filter: string, closed: boolean) {
    if (!filter) return true;
    if (!dueDate || closed) return false;
    const today = localDay();
    if (filter === "overdue") return dueDate < today;
    if (filter === "thisWeek") return dueDate >= today && dueDate <= endOfWeek(today);
    return true;
}

/** "Nov 3", or "Nov 3, 2027" outside the current year. */
export function formatDueDate(day: string, locale: string) {
    const date = dayToDate(day);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
}

/** Text colors for each state: red when late, orange on the day. */
export const dueStateClass: Record<DueState, string> = {
    overdue: "text-danger-primary",
    today: "text-warning-primary",
    upcoming: "text-tertiary",
};
