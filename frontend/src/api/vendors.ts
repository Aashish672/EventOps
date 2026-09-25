import { API_BASE_URL, getCommonHeaders } from "./core";
import { Vendor, VendorBooking } from "./types";

export async function fetchVendors(): Promise<Vendor[]> {
  const response = await fetch(`${API_BASE_URL}/api/vendors/`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch vendors");
  return response.json();
}

export async function createVendor(payload: Partial<Vendor>): Promise<Vendor> {
  const response = await fetch(`${API_BASE_URL}/api/vendors/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create vendor");
  return response.json();
}

export async function fetchVendorBookings(eventId: string): Promise<VendorBooking[]> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch vendor bookings");
  return response.json();
}

export async function createVendorBooking(payload: Partial<VendorBooking>): Promise<VendorBooking> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create vendor booking");
  return response.json();
}

export async function updateVendorBooking(id: string, payload: Partial<VendorBooking>): Promise<VendorBooking> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update vendor booking");
  return response.json();
}

export async function deleteVendorBooking(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/vendor-bookings/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete vendor booking");
}
