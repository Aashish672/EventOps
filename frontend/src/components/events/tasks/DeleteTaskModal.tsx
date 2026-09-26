import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Task } from "../../../api/types";

export interface DeleteTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: (taskId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteTaskModal: React.FC<DeleteTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleDelete = async () => {
    try {
      setError(null);
      await onConfirm(task.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-task-modal-title"
    >
      <div className="modal-container delete-modal-container">
        <div className="modal-header">
          <div className="delete-modal-title-row">
            <div className="delete-icon-wrap">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <h3 id="delete-task-modal-title" className="modal-title">
                Delete Task
              </h3>
              <p className="modal-subtitle">
                Are you sure you want to delete this task?
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="delete-modal-body">
          {error && (
            <div className="form-error-banner" role="alert" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <div className="delete-task-preview">
            <span className="delete-preview-title">{task.title}</span>
            {task.description && (
              <p className="delete-preview-desc">{task.description}</p>
            )}
          </div>
          <p className="delete-warning-text">
            This action cannot be undone. The task and its progress will be permanently removed.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Task"}
          </button>
        </div>
      </div>
    </div>
  );
};
