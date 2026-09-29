import React from "react";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Event } from "../../api/types";
import { Membership } from "../../api/organizations";

export interface EventCardProps {
  event: Event;
  onClick: (eventId: string) => void;
  members?: Membership[];
}

function formatDateRange(startDateStr: string, endDateStr: string): string {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

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

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  members = [],
}) => {
  // Find assigned planner display name if available
  const planner = event.assigned_planner
    ? members.find((m) => m.user_id === event.assigned_planner)
    : null;

  const plannerLabel = planner
    ? planner.username || planner.email
    : event.assigned_planner
    ? `User #${event.assigned_planner}`
    : "Unassigned";

  return (
    <div
      className="event-card"
      role="button"
      tabIndex={0}
      onClick={() => onClick(event.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(event.id);
        }
      }}
      aria-label={`Open event: ${event.name}`}
    >
      <div className="event-card-header">
        <h3 className="event-card-title">{event.name}</h3>
        <span className={`event-status-badge status-${event.status}`}>
          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </span>
      </div>

      {event.description ? (
        <p className="event-card-description">{event.description}</p>
      ) : (
        <p className="event-card-description text-muted-italic">No description provided</p>
      )}

      <div className="event-card-dates">
        <Calendar size={14} className="event-card-icon" />
        <span>{formatDateRange(event.start_date, event.end_date)}</span>
      </div>

      <div className="event-card-footer">
        <div className="event-card-planner">
          <User size={13} className="event-card-icon" />
          <span>{plannerLabel}</span>
        </div>

        <div className="event-card-action">
          <span>Manage</span>
          <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
};
