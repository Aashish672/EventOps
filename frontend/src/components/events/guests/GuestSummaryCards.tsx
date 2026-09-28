import React from "react";
import { Users, CheckCircle2, Clock, XCircle, UtensilsCrossed } from "lucide-react";
import { GuestSummary } from "./guestUtils";

interface GuestSummaryCardsProps {
  summary: GuestSummary;
}

export const GuestSummaryCards: React.FC<GuestSummaryCardsProps> = ({ summary }) => {
  const {
    totalGuests,
    totalHouseholds,
    attendingCount,
    declinedCount,
    pendingCount,
    attendingPercent,
    dietaryRestrictionsCount,
  } = summary;

  return (
    <div className="guest-summary-section" aria-label="Guest RSVP Overview Summary">
      {/* Dietary Restrictions Notification Banner */}
      {dietaryRestrictionsCount > 0 && (
        <div className="guest-dietary-banner" role="status" data-testid="dietary-banner">
          <UtensilsCrossed size={16} />
          <div>
            <strong>Special Requirements:</strong> {dietaryRestrictionsCount}{" "}
            {dietaryRestrictionsCount === 1 ? "guest has" : "guests have"} dietary restrictions
            recorded.
          </div>
        </div>
      )}

      {/* 4 KPI Cards Grid */}
      <div className="guest-kpi-grid">
        {/* Card 1: Total Invited */}
        <div className="guest-kpi-card" data-testid="kpi-total-guests">
          <div className="kpi-header">
            <span className="kpi-label">Total Invited</span>
            <div className="kpi-icon-wrap icon-invited">
              <Users size={16} />
            </div>
          </div>
          <div className="kpi-value">{totalGuests}</div>
          <div className="kpi-subtext">
            Across {totalHouseholds} {totalHouseholds === 1 ? "household" : "households"}
          </div>
        </div>

        {/* Card 2: Attending */}
        <div className="guest-kpi-card" data-testid="kpi-attending">
          <div className="kpi-header">
            <span className="kpi-label">Attending</span>
            <div className="kpi-icon-wrap icon-attending">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value">{attendingCount}</div>
          <div className="kpi-subtext">
            {totalGuests > 0 ? `${attendingPercent}% confirmed` : "No RSVPs yet"}
          </div>
          <div className="kpi-progress-container">
            <div
              className="kpi-progress-bar"
              role="progressbar"
              aria-valuenow={attendingPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Attendance confirmation rate"
              style={{ width: `${attendingPercent}%` }}
            />
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="guest-kpi-card" data-testid="kpi-pending">
          <div className="kpi-header">
            <span className="kpi-label">Pending</span>
            <div className="kpi-icon-wrap icon-pending">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value">{pendingCount}</div>
          <div className="kpi-subtext">Awaiting response</div>
        </div>

        {/* Card 4: Declined */}
        <div className="guest-kpi-card" data-testid="kpi-declined">
          <div className="kpi-header">
            <span className="kpi-label">Declined</span>
            <div className="kpi-icon-wrap icon-declined">
              <XCircle size={16} />
            </div>
          </div>
          <div className="kpi-value">{declinedCount}</div>
          <div className="kpi-subtext">Unable to attend</div>
        </div>
      </div>
    </div>
  );
};
