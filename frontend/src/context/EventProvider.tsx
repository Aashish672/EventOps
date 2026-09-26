import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { EventContext, EventContextType, EventSubTab } from "./EventContext";
import { useEvent } from "../hooks/useEvents";

export interface EventProviderProps {
  eventId?: string;
  children: React.ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({
  eventId: propEventId,
  children,
}) => {
  const { eventId: routeEventId } = useParams<{ eventId: string }>();
  const eventId = propEventId || routeEventId || "";

  const { data: event = null, isLoading, error, refetch } = useEvent(eventId);
  const location = useLocation();

  // Deduce active sub-tab from location pathname (normalizing trailing slashes)
  const activeTab: EventSubTab = React.useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path.endsWith("/timeline")) return "timeline";
    if (path.endsWith("/budget")) return "budget";
    if (path.endsWith("/guests")) return "guests";
    if (path.endsWith("/vendors")) return "vendors";
    return "overview";
  }, [location.pathname]);

  const value: EventContextType = {
    eventId,
    event,
    isLoading,
    error: error as Error | null,
    activeTab,
    refetch: () => {
      refetch();
    },
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
};
