import { API_BASE_URL, getCommonHeaders } from "./core";
import { Task } from "./types";

export async function fetchTasks(eventId: string): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create task");
  }
  return response.json();
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update task");
  }
  return response.json();
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task (HTTP ${response.status})`);
  }
}
