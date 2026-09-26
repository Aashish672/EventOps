import { API_BASE_URL, getCommonHeaders } from "./core";
import { Document } from "./types";

export async function fetchDocuments(eventId: string): Promise<Document[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch documents (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createDocument(payload: Partial<Document>): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/api/documents/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create document (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateDocument(id: string, payload: Partial<Document>): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update document (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete document (HTTP ${response.status})`);
  }
}
