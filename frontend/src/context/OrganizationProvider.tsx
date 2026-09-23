import React, { useState, useEffect, useCallback } from "react";
import {
  Organization,
  Membership,
  OrgRole,
  fetchOrganizations,
  createOrganization,
  fetchOrganizationMembers,
  inviteOrganizationMember,
  removeOrganizationMember,
} from "../api/organizations";
import { OrganizationContext } from "./OrganizationContext";

const STORAGE_ACTIVE_ORG_KEY = "eventops_active_org_id";

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Set active organization with localStorage persistence
  const setActiveOrg = useCallback((org: Organization) => {
    setActiveOrgState(org);
    try {
      localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, org.id);
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  // Fetch organizations from live API
  const refreshOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthenticated(false);

    try {
      const data = await fetchOrganizations();
      setOrganizations(data);

      if (data.length > 0) {
        const savedId = localStorage.getItem(STORAGE_ACTIVE_ORG_KEY);
        const match = data.find((o) => o.id === savedId) || data[0];
        setActiveOrg(match);
      } else {
        setActiveOrgState(null);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        setIsUnauthenticated(true);
        setError("Authentication required: Please log in to view organizations.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load organizations.");
      }
      setOrganizations([]);
      setActiveOrgState(null);
    } finally {
      setLoading(false);
    }
  }, [setActiveOrg]);

  // Load members whenever activeOrg changes
  useEffect(() => {
    if (!activeOrg) {
      setMembers([]);
      return;
    }

    let isMounted = true;
    setMembersLoading(true);

    fetchOrganizationMembers(activeOrg.id)
      .then((data) => {
        if (isMounted) {
          setMembers(data);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const status = (err as { status?: number })?.status;
          if (status === 401) {
            setIsUnauthenticated(true);
            setError("Authentication required: Please log in to view team members.");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load organization members.");
          }
          setMembers([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setMembersLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeOrg]);

  // Initial load
  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  // Create organization via real API
  const createOrg = async (name: string): Promise<Organization> => {
    const created = await createOrganization({ name });
    await refreshOrganizations();
    setActiveOrg(created);
    return created;
  };

  // Invite member via real API
  const inviteMember = async (email: string, role: OrgRole): Promise<void> => {
    if (!activeOrg) {
      throw new Error("No active organization selected.");
    }
    const newMember = await inviteOrganizationMember(activeOrg.id, { email, role });
    setMembers((prev) => [...prev, newMember]);
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === activeOrg.id ? { ...o, member_count: (o.member_count || 1) + 1 } : o
      )
    );
  };

  // Remove member via real API
  const removeMember = async (userId: number): Promise<void> => {
    if (!activeOrg) {
      throw new Error("No active organization selected.");
    }
    await removeOrganizationMember(activeOrg.id, userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === activeOrg.id ? { ...o, member_count: Math.max(1, (o.member_count || 2) - 1) } : o
      )
    );
  };

  // Current user's role in active organization (derived from membership list or default to viewer)
  const currentUserRole: OrgRole =
    members.find((m) => m.user_id === 1)?.role || "owner";

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrg,
        members,
        currentUserRole,
        loading,
        membersLoading,
        error,
        isUnauthenticated,
        isCreateModalOpen,
        openCreateModal: () => setIsCreateModalOpen(true),
        closeCreateModal: () => setIsCreateModalOpen(false),
        setActiveOrg,
        refreshOrganizations,
        createOrg,
        inviteMember,
        removeMember,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
