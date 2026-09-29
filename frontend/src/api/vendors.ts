import { API_BASE_URL, getCommonHeaders } from "./core";
import { Vendor, VendorBooking } from "./types";

// ─── Vendors ─────────────────────────────────────────────────────────────────

export async function fetchVendors(): Promise<Vendor[]> {
  const response = await fetch(`${API_BASE_URL}/api/vendors/`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch vendors (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createVendor(payload: Partial<Vendor>): Promise<Vendor> {
  const response = await fetch(`${API_BASE_URL}/api/vendors/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create vendor (HTTP ${response.status})`);
  }
  return response.json();
}

// ─── Vendor Bookings ─────────────────────────────────────────────────────────

export async function fetchVendorBookings(eventId: string): Promise<VendorBooking[]> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch vendor bookings (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createVendorBooking(payload: Partial<VendorBooking>): Promise<VendorBooking> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create vendor booking (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateVendorBooking(id: string, payload: Partial<VendorBooking>): Promise<VendorBooking> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update vendor booking (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteVendorBooking(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete vendor booking (HTTP ${response.status})`);
  }
}
