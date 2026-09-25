/**
 * Organization and Membership API Client
 */

export type OrgRole = "owner" | "planner" | "coordinator" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at?: string;
  member_count?: number;
}

export interface Membership {
  id: string;
  user_id: number;
  username: string;
  email: string;
  role: OrgRole;
  joined_at: string;
}

export interface CreateOrgPayload {
  name: string;
}

export interface InviteMemberPayload {
  email: string;
  role: OrgRole;
}

import { API_BASE_URL, getCommonHeaders } from "./core";

/**
 * Fetch all organizations the authenticated user belongs to.
 */
export async function fetchOrganizations(): Promise<Organization[]> {
  const response = await fetch(`${API_BASE_URL}/api/orgs/`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    const error: Error & { status?: number } = new Error(
      `Failed to fetch organizations (HTTP ${response.status})`
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Create a new organization.
 */
export async function createOrganization(payload: CreateOrgPayload): Promise<Organization> {
  const response = await fetch(`${API_BASE_URL}/api/orgs/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.detail ||
      errorData.name?.[0] ||
      `Failed to create organization (HTTP ${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Fetch members for a specific organization.
 */
export async function fetchOrganizationMembers(orgId: string): Promise<Membership[]> {
  const response = await fetch(`${API_BASE_URL}/api/orgs/${orgId}/members/`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch organization members (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Invite a new member to an organization with a specific role.
 */
export async function inviteOrganizationMember(
  orgId: string,
  payload: InviteMemberPayload
): Promise<Membership> {
  const response = await fetch(`${API_BASE_URL}/api/orgs/${orgId}/members/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.detail ||
      errorData.email?.[0] ||
      errorData.role?.[0] ||
      `Failed to invite member (HTTP ${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Remove a member from an organization.
 */
export async function removeOrganizationMember(
  orgId: string,
  userId: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/orgs/${orgId}/members/${userId}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.detail || `Failed to remove member (HTTP ${response.status})`;
    throw new Error(message);
  }
}
