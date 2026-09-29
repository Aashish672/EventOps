import React from "react";
import { Store, Plus, Sparkles } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useVendorBookings } from "../../../hooks/useVendors";
import { calculateVendorSummary } from "../vendors/vendorUtils";
import { VendorSummaryCards } from "../vendors/VendorSummaryCards";
import "../vendors/vendors.css";

interface EventVendorsTabProps {
  onBookVendor?: () => void;
}

export const EventVendorsTab: React.FC<EventVendorsTabProps> = ({ onBookVendor }) => {
  const { eventId, event } = useEventContext();
  const { data: bookings = [], isLoading } = useVendorBookings(eventId);

  const summary = calculateVendorSummary(bookings);

  return (
    <div className="event-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Vendor Bookings</h2>
          <p className="tab-pane-description">
            Book external vendors, track contractual milestones, and oversee service agreements for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onBookVendor}
          disabled={!onBookVendor}
          title={onBookVendor ? "Book a vendor" : "Booking modal available in Sub-task 3.6.3"}
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Book Vendor
        </button>
      </div>

      {/* Vendor Summary Cards */}
      {!isLoading && <VendorSummaryCards summary={summary} />}

      {isLoading ? (
        <div
          className="placeholder-pulse"
          style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }}
        />
      ) : bookings.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <Store size={28} color="#9333ea" />
          </div>
          <h3>No Vendors Booked</h3>
          <p>
            No vendors have been booked for this event yet. Use the directory to contract catering, venues, photography, and more.
          </p>
          <div className="epic-badge-note">
            <Sparkles size={13} style={{ marginRight: 4 }} />
            Ready for Epic 3.6: Vendor Bookings Management UI
          </div>
        </div>
      ) : (
        <div className="vendor-preview-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="vendor-preview-item">
              <span className={`vendor-status-pill status-${booking.status}`}>
                {booking.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="booking-price">
                {booking.agreed_price
                  ? `$${parseFloat(booking.agreed_price).toLocaleString()}`
                  : "Price TBD"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
