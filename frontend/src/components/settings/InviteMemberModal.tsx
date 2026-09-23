import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { OrgRole } from "../../api/organizations";

export interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: OrgRole) => Promise<void>;
  orgName: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  orgName,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("planner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setRole("planner");
      setError(null);
      setTimeout(() => emailInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onInvite(email.trim(), role);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite member.");
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
        aria-labelledby="invite-modal-title"
      >
        <div className="modal-header-bar">
          <h3 id="invite-modal-title" className="modal-title-text">
            Invite Team Member
          </h3>
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body-area">
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Add a user to <strong>{orgName}</strong>. Permissions are strictly scoped to this organization.
            </p>

            <div className="form-field">
              <label htmlFor="invite-email-input" className="form-label-text">
                Email Address
              </label>
              <input
                ref={emailInputRef}
                id="invite-email-input"
                type="email"
                className="input-text"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-field">
              <label htmlFor="invite-role-select" className="form-label-text">
                Role & Permissions
              </label>
              <select
                id="invite-role-select"
                className="select-dropdown"
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                disabled={loading}
              >
                <option value="planner">Planner (Manage events, approve budgets)</option>
                <option value="coordinator">Coordinator (Assigned events only)</option>
                <option value="viewer">Viewer (Read-only access)</option>
                <option value="owner">Owner (Full administrative rights)</option>
              </select>
            </div>

            {error && (
              <div className="alert-banner error" role="alert">
                <AlertCircle size={15} />
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
              id="submit-invite-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !email.trim()}
            >
              {loading && <Loader2 size={14} className="spin-icon" />}
              <span>{loading ? "Sending..." : "Send Invitation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
