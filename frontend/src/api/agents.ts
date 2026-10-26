import { API_BASE_URL, getCommonHeaders } from "./core";
import { AgentRun, ChangeLogEntry, ProposalDiff } from "./types";

export async function fetchAgentRuns(eventId: string, state?: string): Promise<AgentRun[]> {
  let url = `${API_BASE_URL}/api/agent-runs/?event=${eventId}`;
  if (state) {
    url += `&state=${state}`;
  }
  const response = await fetch(url, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch agent runs (HTTP ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function approveAgentRun(runId: string): Promise<AgentRun> {
  const response = await fetch(`${API_BASE_URL}/api/agent-runs/${runId}/approve/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = typeof err.detail === "object" ? err.detail.error : err.detail;
    throw new Error(message || `Failed to approve proposal (HTTP ${response.status})`);
  }
  return response.json();
}

export async function rejectAgentRun(runId: string, reason: string = ""): Promise<AgentRun> {
  const response = await fetch(`${API_BASE_URL}/api/agent-runs/${runId}/reject/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = typeof err.detail === "object" ? err.detail.error : err.detail;
    throw new Error(message || `Failed to reject proposal (HTTP ${response.status})`);
  }
  return response.json();
}

export async function editApproveAgentRun(runId: string, modifiedDiff: ProposalDiff): Promise<AgentRun> {
  const response = await fetch(`${API_BASE_URL}/api/agent-runs/${runId}/edit-approve/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify({ modified_diff: modifiedDiff }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = typeof err.detail === "object" ? err.detail.error : err.detail;
    throw new Error(message || `Failed to edit & approve proposal (HTTP ${response.status})`);
  }
  return response.json();
}

export async function fetchChangeLog(eventId: string): Promise<ChangeLogEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/change-log/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch audit log (HTTP ${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function analyzeEventRisk(eventId: string, reason?: string): Promise<AgentRun> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/analyze-risk/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify({ reason: reason || "" }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = typeof err.detail === "object" ? err.detail.error : err.detail;
    throw new Error(message || err.error || `Failed to analyze schedule risk (HTTP ${response.status})`);
  }
  return response.json();
}

