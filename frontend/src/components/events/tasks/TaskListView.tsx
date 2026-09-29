import React from "react";
import {
  Calendar,
  User,
  CheckCircle2,
  CircleDashed,
  Clock,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Task } from "../../../api/types";
import { Membership } from "../../../api/organizations";
import { formatDueDate } from "./taskUtils";

export interface TaskListViewProps {
  tasks: Task[];
  members: Membership[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: Task["status"]) => void;
  updatingTaskId?: string | null;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  members,
  onEdit,
  onDelete,
  onStatusChange,
  updatingTaskId,
}) => {
  return (
    <div className="task-list-table-container">
      <table className="task-data-table" role="table" aria-label="Task List">
        <thead>
          <tr>
            <th style={{ width: 44 }}>Done</th>
            <th>Task</th>
            <th style={{ width: 150 }}>Status</th>
            <th style={{ width: 160 }}>Due Date</th>
            <th style={{ width: 180 }}>Assignee</th>
            <th style={{ width: 90, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const assignee = task.assigned_to
              ? members.find((m) => m.user_id === task.assigned_to)
              : null;

            const { formatted: dueDateText, isOverdue, isToday } = formatDueDate(task.due_date);
            const showUrgent = isOverdue && task.status !== "done";
            const isUpdating = updatingTaskId === task.id;

            return (
              <tr
                key={task.id}
                className={`task-table-row ${task.status === "done" ? "row-done" : ""} ${
                  isUpdating ? "row-updating" : ""
                }`}
              >
                {/* Status Toggle Checkbox */}
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className={`task-check-circle ${task.status === "done" ? "checked" : ""}`}
                    onClick={() => {
                      const nextStatus = task.status === "done" ? "todo" : "done";
                      onStatusChange(task, nextStatus);
                    }}
                    disabled={isUpdating}
                    aria-label={`Mark ${task.title} as ${task.status === "done" ? "incomplete" : "complete"}`}
                    title={task.status === "done" ? "Mark as To Do" : "Mark as Done"}
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 size={18} color="#16a34a" />
                    ) : task.status === "in_progress" ? (
                      <Clock size={18} color="#2563eb" />
                    ) : (
                      <CircleDashed size={18} color="var(--text-muted)" />
                    )}
                  </button>
                </td>

                {/* Title & Description */}
                <td>
                  <div className="task-title-cell">
                    <span className={`task-table-title ${task.status === "done" ? "text-strike" : ""}`}>
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="task-table-desc">{task.description}</span>
                    )}
                  </div>
                </td>

                {/* Status Selector Dropdown */}
                <td>
                  <select
                    className={`task-status-select select-status-${task.status}`}
                    value={task.status}
                    onChange={(e) => onStatusChange(task, e.target.value as Task["status"])}
                    disabled={isUpdating}
                    aria-label={`Status for ${task.title}`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>

                {/* Due Date */}
                <td>
                  <span
                    className={`task-table-date ${
                      showUrgent ? "overdue" : isToday ? "due-today" : ""
                    }`}
                  >
                    {showUrgent ? (
                      <AlertCircle size={13} style={{ marginRight: 4, flexShrink: 0 }} />
                    ) : (
                      <Calendar size={13} style={{ marginRight: 4, flexShrink: 0 }} />
                    )}
                    <span>{showUrgent ? `Overdue: ${dueDateText}` : isToday ? "Due Today" : dueDateText}</span>
                  </span>
                </td>

                {/* Assignee */}
                <td>
                  <span className="task-table-assignee">
                    <User size={13} style={{ marginRight: 5, flexShrink: 0 }} />
                    <span>
                      {assignee
                        ? (assignee.username || assignee.email)
                        : "Unassigned"}
                    </span>
                  </span>
                </td>

                {/* Action Buttons */}
                <td style={{ textAlign: "right" }}>
                  <div className="task-table-actions">
                    <button
                      type="button"
                      className="task-action-icon-btn"
                      onClick={() => onEdit(task)}
                      title="Edit task"
                      aria-label={`Edit ${task.title}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="task-action-icon-btn btn-danger"
                      onClick={() => onDelete(task)}
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
