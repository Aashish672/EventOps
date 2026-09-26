import { createContext } from "react";
import { Event } from "../api/types";

export type EventSubTab = "overview" | "timeline" | "budget" | "guests" | "vendors";

export interface EventContextType {
  eventId: string;
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
  activeTab: EventSubTab;
  refetch: () => void;
}

export const EventContext = createContext<EventContextType | undefined>(undefined);
