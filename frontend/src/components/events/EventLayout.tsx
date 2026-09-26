import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  User,
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Users,
  Store,
} from "lucide-react";
import { useEventContext } from "../../context/useEventContext";
import { useOrganization } from "../../context/useOrganization";

function formatDateRange(startDateStr: string, endDateStr: string): string {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDateStr} - ${endDateStr}`;
    }

    const startFormatted = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const isSameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (isSameDay) {
      const startTime = start.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      const endTime = end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${startFormatted} · ${startTime} - ${endTime}`;
    }

    const endFormatted = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startFormatted} - ${endFormatted}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
}

export const EventLayout: React.FC = () => {
  const { eventId, event, isLoading, error, activeTab } = useEventContext();
  const { members } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="event-layout-container">
        <div className="event-detail-placeholder placeholder-pulse" style={{ padding: "1.5rem" }}>
          <div style={{ height: 28, width: 140, marginBottom: "1.5rem", borderRadius: 4, background: "var(--bg-subtle)" }} />
          <div style={{ height: 42, width: 340, marginBottom: "1rem", borderRadius: 6, background: "var(--bg-subtle)" }} />
          <div style={{ height: 44, width: "100%", marginBottom: "1.5rem", borderRadius: 6, background: "var(--bg-subtle)" }} />
          <div style={{ height: 220, width: "100%", borderRadius: 8, background: "var(--bg-subtle)" }} />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-layout-container">
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
      </div>
    );
  }

  const planner = event.assigned_planner
    ? members.find((m) => m.user_id === event.assigned_planner)
    : null;

  const dateDisplay = formatDateRange(event.start_date, event.end_date);

  const cleanPath = location.pathname.replace(/\/+$/, "");

  // Tab definitions
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={16} />,
      path: `/events/${eventId}/overview`,
      activeMatch: cleanPath === `/events/${eventId}` || cleanPath.endsWith("/overview"),
    },
    {
      id: "timeline",
      label: "Timeline & Tasks",
      icon: <CheckSquare size={16} />,
      path: `/events/${eventId}/timeline`,
      activeMatch: cleanPath.endsWith("/timeline"),
    },
    {
      id: "budget",
      label: "Budget Tracker",
      icon: <DollarSign size={16} />,
      path: `/events/${eventId}/budget`,
      activeMatch: cleanPath.endsWith("/budget"),
    },
    {
      id: "guests",
      label: "Guests",
      icon: <Users size={16} />,
      path: `/events/${eventId}/guests`,
      activeMatch: cleanPath.endsWith("/guests"),
    },
    {
      id: "vendors",
      label: "Vendors",
      icon: <Store size={16} />,
      path: `/events/${eventId}/vendors`,
      activeMatch: cleanPath.endsWith("/vendors"),
    },
  ];

  return (
    <div className="event-layout-container">
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
              {dateDisplay}
            </span>
            <span className="event-detail-planner">
              <User size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
              {planner ? (planner.email || planner.username) : event.assigned_planner ? `Planner #${event.assigned_planner}` : "Unassigned"}
            </span>
          </div>
          <h1 className="event-detail-title">{event.name}</h1>
          {event.description && (
            <p className="event-detail-description">{event.description}</p>
          )}
        </div>
      </div>

      {/* Sub-Navigation Secondary Tabs */}
      <nav className="event-subnav-tabs" role="tablist" aria-label="Event Sub-navigation">
        {tabs.map((tab) => {
          const isActive = tab.activeMatch || activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`event-subnav-tab ${isActive ? "active" : ""}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Nested Route Outlet Content */}
      <div className="event-tab-content">
        <Outlet />
      </div>
    </div>
  );
};
