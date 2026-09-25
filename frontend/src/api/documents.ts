import { API_BASE_URL, getCommonHeaders } from "./core";
import { Document } from "./types";

export async function fetchDocuments(eventId: string): Promise<Document[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

export async function createDocument(payload: Partial<Document>): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/api/documents/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create document");
  return response.json();
}

export async function updateDocument(id: string, payload: Partial<Document>): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update document");
  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete document");
}
