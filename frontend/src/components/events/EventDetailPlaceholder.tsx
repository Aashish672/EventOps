import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Store,
  Sparkles,
} from "lucide-react";
import { useEvent } from "../../hooks/useEvents";

export const EventDetailPlaceholder: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(eventId || "");

  if (isLoading) {
    return (
      <div className="event-detail-placeholder placeholder-pulse" style={{ padding: "2rem" }}>
        <div style={{ height: 32, width: 140, marginBottom: "1.5rem", borderRadius: 4, background: "var(--bg-subtle)" }} />
        <div style={{ height: 48, width: 320, marginBottom: "1rem", borderRadius: 6, background: "var(--bg-subtle)" }} />
        <div style={{ height: 160, width: "100%", borderRadius: 8, background: "var(--bg-subtle)" }} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-state-box error-state">
        <div className="event-state-icon error-icon">⚠️</div>
        <h3>Event Not Found</h3>
        <p>{error?.message || "The requested event could not be found or you don't have access to it."}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/events")}
        >
          <ArrowLeft size={14} style={{ marginRight: 6 }} />
          Back to Events
        </button>
      </div>
    );
  }

  const startDateFormatted = new Date(event.start_date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endDateFormatted = new Date(event.end_date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="event-detail-container">
      {/* Back button */}
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate("/events")}
        aria-label="Back to all events"
      >
        <ArrowLeft size={15} />
        <span>Back to Events</span>
      </button>

      {/* Header Banner */}
      <div className="event-detail-header">
        <div>
          <div className="event-detail-meta">
            <span className={`event-status-badge status-${event.status}`}>
              {event.status.toUpperCase()}
            </span>
            <span className="event-detail-date">
              <Calendar size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
              {startDateFormatted} - {endDateFormatted}
            </span>
          </div>
          <h1 className="event-detail-title">{event.name}</h1>
          {event.description && (
            <p className="event-detail-description">{event.description}</p>
          )}
        </div>
      </div>

      {/* Epic 3.2 Roadmap Banner */}
      <div className="roadmap-notice-box">
        <div className="roadmap-notice-icon">
          <Sparkles size={20} color="var(--accent-primary)" />
        </div>
        <div>
          <div className="roadmap-notice-title">
            Event Workspace Route Activated (/events/{event.id})
          </div>
          <div className="roadmap-notice-text">
            Navigation to this event workspace is now active. Detailed management tabs
            (Timeline & Tasks, Budget Tracker, Guest Lists, and Vendor Bookings) will be
            unlocked in the next epics (Epic 3.2 - 3.5).
          </div>
        </div>
      </div>

      {/* Upcoming Modules Preview Cards */}
      <div className="module-preview-grid">
        <div className="module-preview-card">
          <div className="module-preview-header">
            <div className="module-icon-wrap" style={{ color: "#2563eb" }}>
              <Clock size={18} />
            </div>
            <span className="soon-pill">Epic 3.3</span>
          </div>
          <h4 className="module-preview-title">Timeline & Tasks</h4>
          <p className="module-preview-desc">
            Organize event schedules, milestone deadlines, and planner task assignments.
          </p>
        </div>

        <div className="module-preview-card">
          <div className="module-preview-header">
            <div className="module-icon-wrap" style={{ color: "#16a34a" }}>
              <DollarSign size={18} />
            </div>
            <span className="soon-pill">Epic 3.4</span>
          </div>
          <h4 className="module-preview-title">Budget Tracker</h4>
          <p className="module-preview-desc">
            Manage category allocations, actual vendor costs, and payment statuses.
          </p>
        </div>

        <div className="module-preview-card">
          <div className="module-preview-header">
            <div className="module-icon-wrap" style={{ color: "#d97706" }}>
              <Users size={18} />
            </div>
            <span className="soon-pill">Epic 3.5</span>
          </div>
          <h4 className="module-preview-title">Guest Households</h4>
          <p className="module-preview-desc">
            Track RSVPs, dietary constraints, and group invitations by household.
          </p>
        </div>

        <div className="module-preview-card">
          <div className="module-preview-header">
            <div className="module-icon-wrap" style={{ color: "#9333ea" }}>
              <Store size={18} />
            </div>
            <span className="soon-pill">Epic 3.5</span>
          </div>
          <h4 className="module-preview-title">Vendor Bookings</h4>
          <p className="module-preview-desc">
            Coordinate caterers, florists, and venues directly from your organization directory.
          </p>
        </div>
      </div>
    </div>
  );
};
