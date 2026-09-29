import { API_BASE_URL, getCommonHeaders } from "./core";
import { Task } from "./types";

export async function fetchTasks(eventId: string): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch tasks (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create task (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update task (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete task (HTTP ${response.status})`);
  }
}
