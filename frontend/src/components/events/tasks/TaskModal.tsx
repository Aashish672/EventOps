import React, { useState, useEffect } from "react";
import { X, Calendar, User, AlignLeft, CheckCircle2 } from "lucide-react";
import { Task } from "../../../api/types";
import { Membership } from "../../../api/organizations";

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  initialTask?: Task | null;
  defaultStatus?: Task["status"];
  members: Membership[];
  isSubmitting?: boolean;
}

function toDateTimeInputValue(isoStr: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  defaultStatus = "todo",
  members,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>(defaultStatus);
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize form when opening or changing target task
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title || "");
        setDescription(initialTask.description || "");
        setStatus(initialTask.status || "todo");
        setDueDate(toDateTimeInputValue(initialTask.due_date));
        setAssignedTo(initialTask.assigned_to ? String(initialTask.assigned_to) : "");
      } else {
        setTitle("");
        setDescription("");
        setStatus(defaultStatus);
        setDueDate("");
        setAssignedTo("");
      }
      setError(null);
    }
  }, [isOpen, initialTask, defaultStatus]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    let isoDueDate: string | null = null;
    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        setError("Please enter a valid due date.");
        return;
      }
      isoDueDate = parsedDate.toISOString();
    }

    const payload: Partial<Task> = {
      title: trimmedTitle,
      description: description.trim(),
      status,
      due_date: isoDueDate,
      assigned_to: assignedTo ? parseInt(assignedTo, 10) : null,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save task.");
    }
  };

  const isEditing = Boolean(initialTask);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="modal-container task-modal-container">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 id="task-modal-title" className="modal-title">
              {isEditing ? "Edit Task" : "Create New Task"}
            </h3>
            <p className="modal-subtitle">
              {isEditing
                ? "Update task milestones, assignment, and due date."
                : "Add an action item or milestone to this event."}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error-banner" role="alert">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title" className="form-label required">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Finalize Catering Contract"
              maxLength={255}
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="task-desc" className="form-label">
              <AlignLeft size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Description (Optional)
            </label>
            <textarea
              id="task-desc"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key notes, delivery requirements, or vendor links..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* 2-Column Row: Status & Assignee */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="task-status" className="form-label">
                <CheckCircle2 size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
                Status
              </label>
              <select
                id="task-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                disabled={isSubmitting}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="task-assignee" className="form-label">
                <User size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
                Assignee
              </label>
              <select
                id="task-assignee"
                className="form-select"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.username || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label htmlFor="task-due-date" className="form-label">
              <Calendar size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Due Date & Time (Optional)
            </label>
            <input
              id="task-due-date"
              type="datetime-local"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
