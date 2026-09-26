import { API_BASE_URL, getCommonHeaders } from "./core";
import { Event } from "./types";

/**
 * Fetch all events for the current user's organizations.
 */
export async function fetchEvents(): Promise<Event[]> {
  const response = await fetch(`${API_BASE_URL}/api/events/`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch events (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Fetch a single event by ID.
 */
export async function fetchEvent(id: string): Promise<Event> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch event (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Create a new event.
 */
export async function createEvent(payload: Partial<Event>): Promise<Event> {
  const response = await fetch(`${API_BASE_URL}/api/events/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create event (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Update an event.
 */
export async function updateEvent(id: string, payload: Partial<Event>): Promise<Event> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update event (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Delete an event.
 */
export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete event (HTTP ${response.status})`);
  }
}
