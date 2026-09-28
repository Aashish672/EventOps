import React from "react";
import { X, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Guest, GuestHousehold } from "../../../api/types";

export interface GuestFormData {
  household: string;
  first_name: string;
  last_name: string;
  rsvp_status: "pending" | "attending" | "declined";
  dietary_restrictions?: string;
}

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GuestFormData) => Promise<void>;
  households: GuestHousehold[];
  initialGuest?: Guest | null;
  defaultHouseholdId?: string;
  isSubmitting?: boolean;
}

export const GuestModal: React.FC<GuestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  households,
  initialGuest,
  defaultHouseholdId,
  isSubmitting = false,
}) => {
  const [householdId, setHouseholdId] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [rsvpStatus, setRsvpStatus] = React.useState<"pending" | "attending" | "declined">("pending");
  const [dietaryRestrictions, setDietaryRestrictions] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialGuest);

  React.useEffect(() => {
    if (initialGuest) {
      setHouseholdId(initialGuest.household);
      setFirstName(initialGuest.first_name);
      setLastName(initialGuest.last_name);
      setRsvpStatus(initialGuest.rsvp_status);
      setDietaryRestrictions(initialGuest.dietary_restrictions || "");
    } else {
      setHouseholdId(defaultHouseholdId || (households.length > 0 ? households[0].id : ""));
      setFirstName("");
      setLastName("");
      setRsvpStatus("pending");
      setDietaryRestrictions("");
    }
    setError(null);
  }, [initialGuest, defaultHouseholdId, households, isOpen]);

  // Handle escape key
  React.useEffect(() => {
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
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!householdId) {
      setError("Please select a household for this guest.");
      return;
    }
    if (!trimmedFirstName) {
      setError("First name is required.");
      return;
    }
    if (!trimmedLastName) {
      setError("Last name is required.");
      return;
    }

    try {
      await onSubmit({
        household: householdId,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        rsvp_status: rsvpStatus,
        dietary_restrictions: dietaryRestrictions.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save guest";
      setError(message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-modal-title"
    >
      <div
        className="modal-container"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isEditing ? (
              <UserCheck size={18} color="var(--accent-primary)" />
            ) : (
              <UserPlus size={18} color="var(--accent-primary)" />
            )}
            <h3 id="guest-modal-title" className="modal-title">
              {isEditing ? "Edit Guest" : "Add New Guest"}
            </h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div
            className="modal-body"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {error && (
              <div
                className="form-error-banner"
                role="alert"
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--radius-sm)",
                  color: "#991b1b",
                  fontSize: "0.8rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Household Selection */}
            <div className="form-group">
              <label htmlFor="guest-household-select" className="form-label">
                Household / Family Group <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {households.length === 0 ? (
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-subtle, #f8fafc)",
                    border: "1px dashed var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                    fontSize: "0.825rem",
                  }}
                >
                  No households found. Please create a household before adding guests.
                </div>
              ) : (
                <select
                  id="guest-household-select"
                  className="form-input"
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  disabled={isSubmitting}
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.email ? `(${h.email})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Name Fields (First & Last) in a 2-column grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label htmlFor="guest-first-name" className="form-label">
                  First Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="guest-first-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="guest-last-name" className="form-label">
                  Last Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  id="guest-last-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jenkins"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* RSVP Status */}
            <div className="form-group">
              <label htmlFor="guest-rsvp-status" className="form-label">
                RSVP Status
              </label>
              <select
                id="guest-rsvp-status"
                className="form-input"
                value={rsvpStatus}
                onChange={(e) =>
                  setRsvpStatus(e.target.value as "pending" | "attending" | "declined")
                }
                disabled={isSubmitting}
              >
                <option value="pending">🟡 Pending Response</option>
                <option value="attending">🟢 Attending</option>
                <option value="declined">🔴 Declined</option>
              </select>
            </div>

            {/* Dietary & Accessibility Notes */}
            <div className="form-group">
              <label htmlFor="guest-dietary" className="form-label">
                Dietary Restrictions / Notes
              </label>
              <textarea
                id="guest-dietary"
                className="form-input"
                rows={2}
                placeholder="e.g. Vegetarian, Gluten-free, Nut allergy, Needs highchair"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                disabled={isSubmitting}
                style={{ resize: "vertical" }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                Allergies, preferences, or accessibility requirements.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || households.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" style={{ marginRight: 6 }} />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Guest"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
