import React from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { GuestHousehold, Guest } from "../../../api/types";

export type DeleteGuestTarget =
  | { type: "household"; household: GuestHousehold; memberGuestCount: number }
  | { type: "guest"; guest: Guest };

interface DeleteGuestModalProps {
  isOpen: boolean;
  target: DeleteGuestTarget | null;
  onClose: () => void;
  onConfirm: (target: { type: "household" | "guest"; id: string }) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteGuestModal: React.FC<DeleteGuestModalProps> = ({
  isOpen,
  target,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setError(null);
  }, [isOpen, target]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !target) return null;

  const isHousehold = target.type === "household";
  const title = isHousehold ? "Delete Guest Household" : "Remove Guest";
  const subtitle = isHousehold
    ? `Are you sure you want to delete "${target.household.name}"?`
    : `Are you sure you want to remove "${target.guest.first_name} ${target.guest.last_name}"?`;

  const handleDelete = async () => {
    try {
      setError(null);
      const id = isHousehold ? target.household.id : target.guest.id;
      await onConfirm({ type: target.type, id });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-guest-title"
    >
      <div className="modal-container delete-modal-container" style={{ maxWidth: 450 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="delete-modal-title-row">
            <div className="delete-icon-wrap">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <h3 id="delete-guest-title" className="modal-title">
                {title}
              </h3>
              <p className="modal-subtitle">{subtitle}</p>
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

        {/* Body */}
        <div className="delete-modal-body">
          {error && (
            <div className="form-error-banner" role="alert">
              {error}
            </div>
          )}

          <div className="delete-task-preview">
            {isHousehold ? (
              <>
                <span className="delete-preview-title">{target.household.name}</span>
                <p className="delete-preview-desc">
                  {target.household.email ? `Email: ${target.household.email} • ` : ""}
                  {target.memberGuestCount}{" "}
                  {target.memberGuestCount === 1 ? "member guest" : "member guests"}
                </p>
              </>
            ) : (
              <>
                <span className="delete-preview-title">
                  {target.guest.first_name} {target.guest.last_name}
                </span>
                <p className="delete-preview-desc">
                  RSVP: {target.guest.rsvp_status.toUpperCase()}
                  {target.guest.dietary_restrictions
                    ? ` • Dietary: ${target.guest.dietary_restrictions}`
                    : ""}
                </p>
              </>
            )}
          </div>

          <p className="delete-warning-text">
            {isHousehold
              ? `This action cannot be undone. This household and all of its ${target.memberGuestCount} associated member guest${
                  target.memberGuestCount === 1 ? "" : "s"
                } will be permanently removed.`
              : "This action cannot be undone. This guest will be permanently removed from the event."}
          </p>
        </div>

        {/* Footer */}
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
            {isDeleting ? (
              <>
                <Loader2 size={14} className="spin-icon" style={{ marginRight: 6 }} />
                Deleting...
              </>
            ) : isHousehold ? (
              "Delete Household"
            ) : (
              "Remove Guest"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
