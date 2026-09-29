import React from "react";
import { X, Store, Loader2 } from "lucide-react";
import { Vendor, VendorBooking } from "../../../api/types";
import { VENDOR_CATEGORY_LABELS } from "./vendorUtils";

export interface BookVendorFormData {
  vendor: string;
  status: VendorBooking["status"];
  agreed_price?: string | null;
  contract_notes?: string;
}

interface BookVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BookVendorFormData) => Promise<void>;
  vendors: Vendor[];
  initialBooking?: VendorBooking | null;
  existingBookings?: VendorBooking[];
  isSubmitting?: boolean;
}

const EMPTY_BOOKINGS: VendorBooking[] = [];

export const BookVendorModal: React.FC<BookVendorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vendors,
  initialBooking,
  existingBookings = EMPTY_BOOKINGS,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialBooking);

  // Set of vendor IDs already booked for this event (excluding the currently edited booking)
  const bookedVendorIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const b of existingBookings) {
      if (!initialBooking || b.id !== initialBooking.id) {
        set.add(b.vendor);
      }
    }
    return set;
  }, [existingBookings, initialBooking]);

  const [vendorId, setVendorId] = React.useState("");
  const [status, setStatus] = React.useState<VendorBooking["status"]>("inquiry");
  const [agreedPrice, setAgreedPrice] = React.useState("");
  const [contractNotes, setContractNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (initialBooking) {
      setVendorId(initialBooking.vendor);
      setStatus(initialBooking.status);
      setAgreedPrice(initialBooking.agreed_price ? String(initialBooking.agreed_price) : "");
      setContractNotes(initialBooking.contract_notes || "");
    } else {
      // Find the first available vendor not already booked
      const firstAvailable = vendors.find((v) => !bookedVendorIds.has(v.id));
      setVendorId(firstAvailable ? firstAvailable.id : vendors[0]?.id || "");
      setStatus("inquiry");
      setAgreedPrice("");
      setContractNotes("");
    }
    setError(null);
  }, [initialBooking, vendors, bookedVendorIds, isOpen]);

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

    if (!vendorId) {
      setError("Please select a vendor to book.");
      return;
    }

    if (!isEditing && bookedVendorIds.has(vendorId)) {
      setError("This vendor is already booked for this event.");
      return;
    }

    let parsedPrice: string | null = null;
    if (agreedPrice.trim()) {
      const num = parseFloat(agreedPrice.trim());
      if (isNaN(num) || num < 0) {
        setError("Agreed price must be a valid positive number.");
        return;
      }
      parsedPrice = num.toFixed(2);
    }

    try {
      await onSubmit({
        vendor: vendorId,
        status,
        agreed_price: parsedPrice,
        contract_notes: contractNotes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save vendor booking.";
      setError(message);
    }
  };

  const allVendorsBooked =
    !isEditing && vendors.length > 0 && vendors.every((v) => bookedVendorIds.has(v.id));

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-vendor-modal-title"
    >
      <div
        className="modal-container"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Store size={18} color="var(--accent-primary)" />
            <h3 id="book-vendor-modal-title" className="modal-title">
              {isEditing ? "Edit Vendor Booking" : "Book Vendor"}
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

            {/* Vendor Selector */}
            <div className="form-group">
              <label htmlFor="booking-vendor-select" className="form-label">
                Select Vendor <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {vendors.length === 0 ? (
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
                  No vendors found in your directory. Please add vendors in Settings or Directory first.
                </div>
              ) : allVendorsBooked ? (
                <div
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "var(--radius-sm)",
                    color: "#b45309",
                    fontSize: "0.825rem",
                  }}
                >
                  All vendors in your directory are already booked for this event.
                </div>
              ) : (
                <select
                  id="booking-vendor-select"
                  className="form-input"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  disabled={isSubmitting || isEditing}
                >
                  {vendors.map((v) => {
                    const isAlreadyBooked = bookedVendorIds.has(v.id);
                    return (
                      <option key={v.id} value={v.id} disabled={isAlreadyBooked}>
                        {v.name} ({VENDOR_CATEGORY_LABELS[v.category] || v.category})
                        {isAlreadyBooked ? " — Already Booked" : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Booking Status & Agreed Price (2-Column Grid) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label htmlFor="booking-status-select" className="form-label">
                  Booking Status <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  id="booking-status-select"
                  className="form-input"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as VendorBooking["status"])
                  }
                  disabled={isSubmitting}
                >
                  <option value="inquiry">🟡 Inquiry Sent</option>
                  <option value="contract_sent">🔵 Contract Sent</option>
                  <option value="booked">🟢 Booked / Confirmed</option>
                  <option value="rejected">🔴 Rejected</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="booking-price-input" className="form-label">
                  Agreed Cost ($)
                </label>
                <input
                  id="booking-price-input"
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 2500.00"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Contract Notes */}
            <div className="form-group">
              <label htmlFor="booking-notes-input" className="form-label">
                Contract Notes & Terms
              </label>
              <textarea
                id="booking-notes-input"
                className="form-input"
                rows={3}
                placeholder="e.g. Deposit terms, cancellation policy, tasting schedule, contact person specifics..."
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
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
                Key terms, milestone payment dates, or notes on service scope.
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
              disabled={isSubmitting || (allVendorsBooked && !isEditing) || vendors.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin-icon" style={{ marginRight: 6 }} />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Confirm Booking"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
