import { createContext } from "react";
import { Organization, Membership, OrgRole } from "../api/organizations";

export interface OrganizationContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  members: Membership[];
  currentUserRole: OrgRole;
  loading: boolean;
  membersLoading: boolean;
  error: string | null;
  isUnauthenticated: boolean;
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  setActiveOrg: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  createOrg: (name: string) => Promise<Organization>;
  inviteMember: (email: string, role: OrgRole) => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);
