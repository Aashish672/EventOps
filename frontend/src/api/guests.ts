import { API_BASE_URL, getCommonHeaders } from "./core";
import { GuestHousehold, Guest } from "./types";

// ─── Guest Households ────────────────────────────────────────────────────────

export async function fetchHouseholds(eventId: string): Promise<GuestHousehold[]> {
  const response = await fetch(`${API_BASE_URL}/api/guest-households/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch households (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createHousehold(payload: Partial<GuestHousehold>): Promise<GuestHousehold> {
  const response = await fetch(`${API_BASE_URL}/api/guest-households/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create household (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateHousehold(id: string, payload: Partial<GuestHousehold>): Promise<GuestHousehold> {
  const response = await fetch(`${API_BASE_URL}/api/guest-households/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update household (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteHousehold(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/guest-households/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete household (HTTP ${response.status})`);
  }
}

// ─── Guests ──────────────────────────────────────────────────────────────────

export async function fetchGuests(eventId: string): Promise<Guest[]> {
  const response = await fetch(`${API_BASE_URL}/api/guests/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch guests (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createGuest(payload: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE_URL}/api/guests/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create guest (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateGuest(id: string, payload: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE_URL}/api/guests/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update guest (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteGuest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/guests/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete guest (HTTP ${response.status})`);
  }
}
