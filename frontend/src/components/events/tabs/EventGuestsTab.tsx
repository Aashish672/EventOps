import React from "react";
import { Users, Plus, Sparkles } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useHouseholds } from "../../../hooks/useGuests";
import { GuestHousehold } from "../../../api/types";

export const EventGuestsTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: households = [], isLoading } = useHouseholds(eventId);

  return (
    <div className="event-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Guest Households & RSVPs</h2>
          <p className="tab-pane-description">
            Organize guest invitations, group invitations by household, and monitor RSVP responses for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          title="Add household functionality arriving in Epic 3.5"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Household
          <span className="soon-pill" style={{ marginLeft: 6 }}>Epic 3.5</span>
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : households.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <Users size={28} color="#d97706" />
          </div>
          <h3>No Guest Households Added</h3>
          <p>
            The guest directory, household groupings, and RSVP tracking interface will be activated in <strong>Epic 3.5</strong>.
          </p>
          <div className="epic-badge-note">
            <Sparkles size={13} style={{ marginRight: 4 }} />
            Ready for Epic 3.5: Guest & Vendor Management UI
          </div>
        </div>
      ) : (
        <div className="guest-preview-list">
          {households.map((h: GuestHousehold) => (
            <div key={h.id} className="guest-preview-item">
              <span className="household-name">{h.name}</span>
              <span className="household-email">{h.email || "No email"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
