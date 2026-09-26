import React, { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useCreateEvent } from "../../hooks/useEvents";
import { Event } from "../../api/types";
import { Membership } from "../../api/organizations";

export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  members?: Membership[];
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  members = [],
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Event["status"]>("draft");
  const [assignedPlanner, setAssignedPlanner] = useState<string>("");
  const [clientError, setClientError] = useState<string | null>(null);

  const createEventMutation = useCreateEvent();

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      // Default dates: tomorrow at 09:00 AM and 05:00 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      setStartDate(`${tomorrowStr}T09:00`);
      setEndDate(`${tomorrowStr}T17:00`);
      setStatus("draft");
      setAssignedPlanner("");
      setClientError(null);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !createEventMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, createEventMutation.isPending]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (!name.trim()) {
      setClientError("Event name is required.");
      return;
    }

    if (!startDate) {
      setClientError("Start date & time is required.");
      return;
    }

    if (!endDate) {
      setClientError("End date & time is required.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setClientError("Invalid date/time format.");
      return;
    }

    if (end < start) {
      setClientError("End date and time cannot be earlier than start date.");
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        organization: organizationId,
        name: name.trim(),
        description: description.trim(),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        status,
        assigned_planner: assignedPlanner ? parseInt(assignedPlanner, 10) : null,
      });

      onClose();
    } catch (err: unknown) {
      // Error handled by mutation state, but capture detail message if present
      const message =
        err instanceof Error ? err.message : "Failed to create event. Please try again.";
      setClientError(message);
    }
  };

  const eligiblePlanners = members.filter(
    (m) => m.role === "owner" || m.role === "planner"
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Calendar size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 className="modal-title">Create New Event</h2>
              <p className="modal-subtitle">
                Set up a new operational event space for your team.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={createEventMutation.isPending}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {clientError && (
              <div className="error-banner" role="alert">
                <AlertCircle size={16} />
                <span>{clientError}</span>
              </div>
            )}

            {/* Event Name */}
            <div className="form-group">
              <label htmlFor="event-name" className="form-label">
                Event Name <span className="required-star">*</span>
              </label>
              <input
                id="event-name"
                type="text"
                className="form-input"
                placeholder="e.g. Annual Tech Summit 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={createEventMutation.isPending}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="event-description" className="form-label">
                Description <span className="optional-tag">(Optional)</span>
              </label>
              <textarea
                id="event-description"
                className="form-textarea"
                rows={3}
                placeholder="Brief summary of event objectives, theme, or venue notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createEventMutation.isPending}
              />
            </div>

            {/* Date & Time Row */}
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="event-start-date" className="form-label">
                  Start Date & Time <span className="required-star">*</span>
                </label>
                <input
                  id="event-start-date"
                  type="datetime-local"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={createEventMutation.isPending}
                />
              </div>

              <div className="form-group">
                <label htmlFor="event-end-date" className="form-label">
                  End Date & Time <span className="required-star">*</span>
                </label>
                <input
                  id="event-end-date"
                  type="datetime-local"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={createEventMutation.isPending}
                />
              </div>
            </div>

            {/* Status & Assigned Planner Row */}
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="event-status" className="form-label">
                  Initial Status
                </label>
                <select
                  id="event-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Event["status"])}
                  disabled={createEventMutation.isPending}
                >
                  <option value="draft">Draft (Planning stage)</option>
                  <option value="planning">Planning (Active coordination)</option>
                  <option value="active">Active (Happening now)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="event-planner" className="form-label">
                  Assigned Planner
                </label>
                <select
                  id="event-planner"
                  className="form-select"
                  value={assignedPlanner}
                  onChange={(e) => setAssignedPlanner(e.target.value)}
                  disabled={createEventMutation.isPending}
                >
                  <option value="">Unassigned</option>
                  {eligiblePlanners.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.username || p.email} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={createEventMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? (
                <>
                  <Loader2 size={16} className="btn-spinner" />
                  Creating Event...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
