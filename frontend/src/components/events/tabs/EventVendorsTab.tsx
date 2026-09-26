import React from "react";
import { Store, Plus, Sparkles } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useVendorBookings } from "../../../hooks/useVendors";

export const EventVendorsTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: bookings = [], isLoading } = useVendorBookings(eventId);

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
          title="Add booking functionality arriving in Epic 3.5"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Book Vendor
          <span className="soon-pill" style={{ marginLeft: 6 }}>Epic 3.5</span>
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : bookings.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <Store size={28} color="#9333ea" />
          </div>
          <h3>No Vendors Booked</h3>
          <p>
            The vendor booking management interface and contracts workflow will be activated in <strong>Epic 3.5</strong>.
          </p>
          <div className="epic-badge-note">
            <Sparkles size={13} style={{ marginRight: 4 }} />
            Ready for Epic 3.5: Guest & Vendor Management UI
          </div>
        </div>
      ) : (
        <div className="vendor-preview-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="vendor-preview-item">
              <span className={`booking-status-badge status-${booking.status}`}>
                {booking.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="booking-price">
                {booking.agreed_price ? `$${parseFloat(booking.agreed_price).toLocaleString()}` : "Price TBD"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
