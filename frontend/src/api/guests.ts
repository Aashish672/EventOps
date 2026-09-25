import { API_BASE_URL, getCommonHeaders } from "./core";
import { GuestHousehold, Guest } from "./types";

export async function fetchHouseholds(eventId: string): Promise<GuestHousehold[]> {
  const response = await fetch(`${API_BASE_URL}/api/households/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch households");
  return response.json();
}

export async function createHousehold(payload: Partial<GuestHousehold>): Promise<GuestHousehold> {
  const response = await fetch(`${API_BASE_URL}/api/households/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create household");
  return response.json();
}

export async function updateHousehold(id: string, payload: Partial<GuestHousehold>): Promise<GuestHousehold> {
  const response = await fetch(`${API_BASE_URL}/api/households/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update household");
  return response.json();
}

export async function deleteHousehold(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/households/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete household");
}

export async function fetchGuests(eventId: string): Promise<Guest[]> {
  const response = await fetch(`${API_BASE_URL}/api/guests/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch guests");
  return response.json();
}

export async function createGuest(payload: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE_URL}/api/guests/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create guest");
  return response.json();
}

export async function updateGuest(id: string, payload: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`${API_BASE_URL}/api/guests/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update guest");
  return response.json();
}

export async function deleteGuest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/guests/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete guest");
}
