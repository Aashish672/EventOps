/**
 * Organization and Membership API Client
 */
import { supabase } from "../lib/supabase";

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";



async function getCommonHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Ask Supabase for the current logged-in user's session
  const { data: { session } } = await supabase.auth.getSession();

  // If they have a valid token, attach it as a Bearer token
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

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
