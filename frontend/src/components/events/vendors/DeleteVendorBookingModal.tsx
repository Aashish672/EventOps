import React from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { VendorBooking, Vendor } from "../../../api/types";
import {
  formatCurrency,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_CONFIG,
} from "./vendorUtils";

interface DeleteVendorBookingModalProps {
  isOpen: boolean;
  booking: VendorBooking | null;
  vendor?: Vendor;
  onClose: () => void;
  onConfirm: (bookingId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteVendorBookingModal: React.FC<DeleteVendorBookingModalProps> = ({
  isOpen,
  booking,
  vendor,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setError(null);
  }, [isOpen, booking]);

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

  if (!isOpen || !booking) return null;

  const vendorName = vendor?.name || "this vendor";
  const categoryLabel = vendor?.category
    ? VENDOR_CATEGORY_LABELS[vendor.category] || "Other"
    : "Vendor";
  const statusConfig = VENDOR_STATUS_CONFIG[booking.status] || {
    label: booking.status,
    className: "status-inquiry",
  };

  const handleDelete = async () => {
    try {
      setError(null);
      await onConfirm(booking.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete booking.");
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
      aria-labelledby="delete-vendor-booking-title"
    >
      <div className="modal-container delete-modal-container" style={{ maxWidth: 450 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="delete-modal-title-row">
            <div className="delete-icon-wrap">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <h3 id="delete-vendor-booking-title" className="modal-title">
                Delete Vendor Booking
              </h3>
              <p className="modal-subtitle">
                Are you sure you want to remove the booking for &ldquo;{vendorName}&rdquo;?
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

        {/* Body */}
        <div className="delete-modal-body">
          {error && (
            <div className="form-error-banner" role="alert">
              {error}
            </div>
          )}

          <div className="delete-task-preview">
            <span className="delete-preview-title">{vendorName}</span>
            <p className="delete-preview-desc">
              Category: {categoryLabel} • Status: {statusConfig.label} • Cost:{" "}
              {booking.agreed_price ? formatCurrency(booking.agreed_price) : "TBD"}
            </p>
          </div>

          <p className="delete-warning-text">
            This action cannot be undone. This vendor booking and all associated contract notes will be permanently removed.
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
            ) : (
              "Delete Booking"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
