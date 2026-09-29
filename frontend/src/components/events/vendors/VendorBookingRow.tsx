import React from "react";
import { Edit2, Trash2, Mail, Phone, User, Loader2 } from "lucide-react";
import { VendorBooking, Vendor } from "../../../api/types";
import {
  formatCurrency,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_CONFIG,
} from "./vendorUtils";

interface VendorBookingRowProps {
  booking: VendorBooking;
  vendor?: Vendor;
  onEditBooking?: (booking: VendorBooking) => void;
  onDeleteBooking?: (booking: VendorBooking) => void;
  onUpdateStatus?: (booking: VendorBooking, newStatus: VendorBooking["status"]) => void;
  isUpdatingStatus?: boolean;
}

export const VendorBookingRow: React.FC<VendorBookingRowProps> = ({
  booking,
  vendor,
  onEditBooking,
  onDeleteBooking,
  onUpdateStatus,
  isUpdatingStatus = false,
}) => {
  const statusConfig = VENDOR_STATUS_CONFIG[booking.status] || {
    label: booking.status,
    className: "status-inquiry",
  };

  const categoryLabel = vendor?.category
    ? VENDOR_CATEGORY_LABELS[vendor.category] || "Other"
    : "Uncategorized";

  const vendorName = vendor?.name || "Unknown Vendor";

  return (
    <tr className="vendor-table-row" data-testid={`booking-row-${booking.id}`}>
      {/* Vendor Name & Point of Contact */}
      <td>
        <div className="vendor-name-cell">
          <span className="vendor-primary-name">{vendorName}</span>
          <div className="vendor-contact-preview">
            {vendor?.point_of_contact && (
              <span className="vendor-contact-item" title={`Contact: ${vendor.point_of_contact}`}>
                <User size={11} />
                <span>{vendor.point_of_contact}</span>
              </span>
            )}
            {vendor?.email && (
              <span className="vendor-contact-item" title={vendor.email}>
                <Mail size={11} />
                <span>{vendor.email}</span>
              </span>
            )}
            {vendor?.phone && (
              <span className="vendor-contact-item" title={vendor.phone}>
                <Phone size={11} />
                <span>{vendor.phone}</span>
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td>
        <span className="vendor-category-tag">{categoryLabel}</span>
      </td>

      {/* Agreed Cost */}
      <td>
        {booking.agreed_price ? (
          <span className="vendor-price-value">{formatCurrency(booking.agreed_price)}</span>
        ) : (
          <span className="vendor-price-tbd">Price TBD</span>
        )}
      </td>

      {/* Status & Inline Transition */}
      <td>
        <div className="vendor-status-wrapper">
          <span className={`vendor-status-pill ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          {onUpdateStatus && (
            <>
              {isUpdatingStatus ? (
                <Loader2 size={13} className="spin-icon" />
              ) : (
                <select
                  className="vendor-status-select"
                  value={booking.status}
                  onChange={(e) =>
                    onUpdateStatus(booking, e.target.value as VendorBooking["status"])
                  }
                  aria-label={`Change status for ${vendorName}`}
                  title="Update booking status"
                >
                  <option value="inquiry">Inquiry Sent</option>
                  <option value="contract_sent">Contract Sent</option>
                  <option value="booked">Booked / Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </>
          )}
        </div>
      </td>

      {/* Contract Notes */}
      <td>
        {booking.contract_notes ? (
          <span className="vendor-notes-text" title={booking.contract_notes}>
            {booking.contract_notes}
          </span>
        ) : (
          <span className="vendor-notes-empty">No notes recorded</span>
        )}
      </td>

      {/* Actions */}
      <td>
        <div className="vendor-actions-wrap">
          {onEditBooking && (
            <button
              type="button"
              className="vendor-action-btn"
              onClick={() => onEditBooking(booking)}
              aria-label={`Edit booking for ${vendorName}`}
              title="Edit booking"
            >
              <Edit2 size={13} />
            </button>
          )}
          {onDeleteBooking && (
            <button
              type="button"
              className="vendor-action-btn delete"
              onClick={() => onDeleteBooking(booking)}
              aria-label={`Delete booking for ${vendorName}`}
              title="Delete booking"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
