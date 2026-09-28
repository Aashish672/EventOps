import React from "react";
import { X, Home, Loader2 } from "lucide-react";
import { GuestHousehold } from "../../../api/types";

interface GuestHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; address?: string; email?: string }) => Promise<void>;
  initialHousehold?: GuestHousehold | null;
  isSubmitting?: boolean;
}

export const GuestHouseholdModal: React.FC<GuestHouseholdModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialHousehold,
  isSubmitting = false,
}) => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialHousehold);

  React.useEffect(() => {
    if (initialHousehold) {
      setName(initialHousehold.name);
      setEmail(initialHousehold.email || "");
      setAddress(initialHousehold.address || "");
    } else {
      setName("");
      setEmail("");
      setAddress("");
    }
    setError(null);
  }, [initialHousehold, isOpen]);

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Household name is required.");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        email: email.trim(),
        address: address.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save household";
      setError(message);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="household-modal-title"
    >
      <div
        className="modal-container"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Home size={18} color="var(--accent-primary)" />
            <h3 id="household-modal-title" className="modal-title">
              {isEditing ? "Edit Guest Household" : "Add Guest Household"}
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

            {/* Household Name */}
            <div className="form-group">
              <label htmlFor="household-name" className="form-label">
                Household / Group Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="household-name"
                type="text"
                className="form-input"
                placeholder="e.g. The Anderson Family or Dr. Evelyn Reed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                Identifies invitations and physical seat groupings.
              </span>
            </div>

            {/* Primary Email */}
            <div className="form-group">
              <label htmlFor="household-email" className="form-label">
                Primary Contact Email
              </label>
              <input
                id="household-email"
                type="email"
                className="form-input"
                placeholder="e.g. contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label htmlFor="household-address" className="form-label">
                Mailing / Physical Address
              </label>
              <textarea
                id="household-address"
                className="form-input"
                rows={2}
                placeholder="e.g. 123 Elm Street, Suite 4B, Springfield"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
                style={{ resize: "vertical" }}
              />
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" style={{ marginRight: 6 }} />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Household"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
