/**
 * Utilities for task date calculations and urgency formatting.
 */
export function formatDueDate(dueDateStr: string | null): {
  formatted: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  if (!dueDateStr) {
    return { formatted: "No due date", isOverdue: false, isToday: false };
  }

  try {
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) {
      return { formatted: dueDateStr, isOverdue: false, isToday: false };
    }

    const now = new Date();
    const isToday =
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate();

    // Overdue if end of due date day is before right now
    const isOverdue = due.getTime() < now.getTime() && !isToday;

    const formatted = due.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: due.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    return { formatted, isOverdue, isToday };
  } catch {
    return { formatted: dueDateStr, isOverdue: false, isToday: false };
  }
}
