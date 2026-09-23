import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { Membership } from "../../api/organizations";

export interface ConfirmRemoveModalProps {
  member: Membership | null;
  orgName: string;
  onClose: () => void;
  onConfirm: (userId: number) => Promise<void>;
}

export const ConfirmRemoveModal: React.FC<ConfirmRemoveModalProps> = ({
  member,
  orgName,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(member.user_id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
      >
        <div className="modal-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--danger)" />
            <h3 id="confirm-remove-title" className="modal-title-text">
              Remove Team Member
            </h3>
          </div>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body-area">
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Are you sure you want to remove <strong>{member.username || member.email}</strong> from <strong>{orgName}</strong>?
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            This will immediately revoke their access to all events, budgets, and operational records under this organization.
          </p>

          {error && (
            <div className="alert-banner error" role="alert">
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer-bar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            id="confirm-remove-member-btn"
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={14} className="spin-icon" />}
            <span>{loading ? "Removing..." : "Remove Member"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
