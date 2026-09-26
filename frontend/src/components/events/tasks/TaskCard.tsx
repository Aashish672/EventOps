import React from "react";
import {
  Calendar,
  User,
  MoreVertical,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Task } from "../../../api/types";
import { Membership } from "../../../api/organizations";
import { formatDueDate } from "./taskUtils";

export interface TaskCardProps {
  task: Task;
  members: Membership[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: Task["status"]) => void;
  isUpdating?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  members,
  onEdit,
  onDelete,
  onStatusChange,
  isUpdating = false,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const assignee = task.assigned_to
    ? members.find((m) => m.user_id === task.assigned_to)
    : null;

  const { formatted: dueDateText, isOverdue, isToday } = formatDueDate(task.due_date);
  const showUrgent = isOverdue && task.status !== "done";

  return (
    <div className={`kanban-task-card status-border-${task.status} ${isUpdating ? "card-updating" : ""}`}>
      {/* Top Header: Title & Menu */}
      <div className="task-card-header">
        <h4 className="task-card-title" title={task.title}>
          {task.title}
        </h4>
        <div className="task-menu-container" ref={menuRef}>
          <button
            type="button"
            className="task-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`Actions for ${task.title}`}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="task-dropdown-menu" role="menu">
              <button
                type="button"
                className="task-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(task);
                }}
              >
                <Pencil size={13} />
                <span>Edit Task</span>
              </button>
              <button
                type="button"
                className="task-dropdown-item item-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(task);
                }}
              >
                <Trash2 size={13} />
                <span>Delete Task</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description if present */}
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* Metadata Row: Due Date & Assignee */}
      <div className="task-card-meta">
        {/* Due Date Tag */}
        <span
          className={`task-date-pill ${
            showUrgent ? "overdue" : isToday ? "due-today" : ""
          }`}
          title={task.due_date ? `Due: ${new Date(task.due_date).toLocaleString()}` : "No due date"}
        >
          {showUrgent ? (
            <AlertCircle size={12} style={{ marginRight: 4, flexShrink: 0 }} />
          ) : (
            <Calendar size={12} style={{ marginRight: 4, flexShrink: 0 }} />
          )}
          <span>{showUrgent ? `Overdue: ${dueDateText}` : isToday ? "Due Today" : dueDateText}</span>
        </span>

        {/* Assignee Tag */}
        <span className="task-assignee-pill" title={assignee ? assignee.email : "Unassigned"}>
          <User size={12} style={{ marginRight: 4, flexShrink: 0 }} />
          <span>
            {assignee ? (assignee.username || assignee.email.split("@")[0]) : "Unassigned"}
          </span>
        </span>
      </div>

      {/* Quick Action Footer: Status Progression */}
      <div className="task-card-actions">
        {task.status === "todo" && (
          <button
            type="button"
            className="task-step-btn step-forward"
            onClick={() => onStatusChange(task, "in_progress")}
            disabled={isUpdating}
            title="Mark as In Progress"
          >
            <span>Start</span>
            <ArrowRight size={12} />
          </button>
        )}

        {task.status === "in_progress" && (
          <>
            <button
              type="button"
              className="task-step-btn step-back"
              onClick={() => onStatusChange(task, "todo")}
              disabled={isUpdating}
              title="Move back to To Do"
            >
              <RotateCcw size={11} />
              <span>To Do</span>
            </button>
            <button
              type="button"
              className="task-step-btn step-forward"
              onClick={() => onStatusChange(task, "done")}
              disabled={isUpdating}
              title="Mark as Complete"
            >
              <CheckCircle size={12} />
              <span>Done</span>
            </button>
          </>
        )}

        {task.status === "done" && (
          <button
            type="button"
            className="task-step-btn step-back"
            onClick={() => onStatusChange(task, "in_progress")}
            disabled={isUpdating}
            title="Reopen task"
          >
            <RotateCcw size={11} />
            <span>Reopen</span>
          </button>
        )}
      </div>
    </div>
  );
};
