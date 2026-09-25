import React, { useState, useMemo } from "react";
import { Plus, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "../../context/useOrganization";
import { useEvents } from "../../hooks/useEvents";
import { EventList } from "./EventList";
import { CreateEventModal } from "./CreateEventModal";

export const EventsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeOrg, members } = useOrganization();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch events using React Query
  const { data: allEvents = [], isLoading, error, refetch } = useEvents();

  // Filter events strictly for the active organization (tenant isolation)
  const orgEvents = useMemo(() => {
    if (!activeOrg) return [];
    return allEvents.filter((ev) => ev.organization === activeOrg.id);
  }, [allEvents, activeOrg]);

  // Navigate to event workspace
  const handleSelectEvent = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  if (!activeOrg) {
    return (
      <div className="event-state-box no-org-state">
        <div className="event-state-icon">
          <Building2 size={36} color="var(--text-muted)" />
        </div>
        <h3>No Organization Selected</h3>
        <p>Please select or create an organization from the top bar to view events.</p>
      </div>
    );
  }

  return (
    <div className="events-dashboard">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <div className="page-header-pretitle">OPERATIONS</div>
          <h1 className="page-title">Events</h1>
          <p className="page-description">
            Plan, organize, and monitor all events for <strong>{activeOrg.name}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          id="create-event-btn"
        >
          <Plus size={16} style={{ marginRight: 6 }} />
          Create Event
        </button>
      </div>

      {/* Events List */}
      <EventList
        events={orgEvents}
        isLoading={isLoading}
        error={error}
        onSelectEvent={handleSelectEvent}
        onCreateClick={() => setIsCreateModalOpen(true)}
        onRetry={() => refetch()}
        members={members}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        organizationId={activeOrg.id}
        members={members}
      />
    </div>
  );
};
