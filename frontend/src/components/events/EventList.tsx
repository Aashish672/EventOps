import React, { useState, useMemo } from "react";
import { Search, Calendar, Plus, RefreshCw, X } from "lucide-react";
import { Event } from "../../api/types";
import { Membership } from "../../api/organizations";
import { EventCard } from "./EventCard";

export interface EventListProps {
  events: Event[];
  isLoading: boolean;
  error: Error | null;
  onSelectEvent: (eventId: string) => void;
  onCreateClick: () => void;
  onRetry?: () => void;
  members?: Membership[];
}

type StatusFilter = "all" | Event["status"];

export const EventList: React.FC<EventListProps> = ({
  events,
  isLoading,
  error,
  onSelectEvent,
  onCreateClick,
  onRetry,
  members = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Calculate status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: events.length,
      draft: 0,
      planning: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };
    events.forEach((ev) => {
      if (c[ev.status] !== undefined) {
        c[ev.status]++;
      }
    });
    return c;
  }, [events]);

  // Filter events by query and status
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesStatus =
        statusFilter === "all" ? true : ev.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === ""
          ? true
          : ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [events, searchQuery, statusFilter]);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="event-list-container">
        <div className="event-list-toolbar">
          <div className="search-input-wrapper placeholder-pulse" style={{ width: 280, height: 38 }} />
        </div>
        <div className="events-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="event-card-skeleton placeholder-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="event-state-box error-state">
        <div className="event-state-icon error-icon">⚠️</div>
        <h3>Failed to load events</h3>
        <p>{error.message || "An unexpected error occurred while fetching events."}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Retry
          </button>
        )}
      </div>
    );
  }

  // 3. Absolute Empty State (No events at all)
  if (events.length === 0) {
    return (
      <div className="event-state-box empty-state">
        <div className="event-state-icon">
          <Calendar size={36} color="var(--accent-primary)" />
        </div>
        <h3>No events created yet</h3>
        <p>
          Get started by creating your first event. You'll be able to manage timelines,
          budgets, guest lists, and vendors in one workspace.
        </p>
        <button type="button" className="btn btn-primary" onClick={onCreateClick}>
          <Plus size={16} style={{ marginRight: 6 }} />
          Create Event
        </button>
      </div>
    );
  }

  return (
    <div className="event-list-container">
      {/* Toolbar: Search + Status Filter Pills */}
      <div className="event-list-toolbar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search events by name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="status-filter-pills" role="tablist" aria-label="Filter events by status">
          {(
            [
              { key: "all", label: "All" },
              { key: "draft", label: "Draft" },
              { key: "planning", label: "Planning" },
              { key: "active", label: "Active" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={statusFilter === key}
              className={`status-pill ${statusFilter === key ? "active" : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              <span>{label}</span>
              <span className="status-pill-count">{counts[key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Filtered Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="event-state-box no-results-state">
          <p className="no-results-title">No events match your filter</p>
          <p className="no-results-desc">
            Try adjusting your search query or selecting a different status filter.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={onSelectEvent}
              members={members}
            />
          ))}
        </div>
      )}
    </div>
  );
};
