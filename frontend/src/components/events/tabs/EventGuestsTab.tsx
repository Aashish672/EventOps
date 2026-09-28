import React from "react";
import { Users, Plus, Sparkles } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useHouseholds, useGuests } from "../../../hooks/useGuests";
import { GuestHousehold } from "../../../api/types";
import { calculateGuestSummary } from "../guests/guestUtils";
import { GuestSummaryCards } from "../guests/GuestSummaryCards";
import "../guests/guests.css";

export const EventGuestsTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: households = [], isLoading: isLoadingHouseholds } = useHouseholds(eventId);
  const { data: guests = [], isLoading: isLoadingGuests } = useGuests(eventId);

  const isLoading = isLoadingHouseholds || isLoadingGuests;
  const summary = calculateGuestSummary(guests, households);

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
          title="Add household functionality arriving in Epic 3.5.3"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Household
          <span className="soon-pill" style={{ marginLeft: 6 }}>Sub-task 3.5.3</span>
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : (
        <>
          {/* Top KPI RSVP Overview */}
          <GuestSummaryCards summary={summary} />

          {households.length === 0 ? (
            <div className="event-state-box empty-state">
              <div className="event-state-icon">
                <Users size={28} color="#d97706" />
              </div>
              <h3>No Guest Households Added</h3>
              <p>
                The guest directory, household groupings, and RSVP tracking interface will be activated in <strong>Sub-task 3.5.2</strong>.
              </p>
              <div className="epic-badge-note">
                <Sparkles size={13} style={{ marginRight: 4 }} />
                Ready for Sub-task 3.5.2: Household & Guest Member Table
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
        </>
      )}
    </div>
  );
};

