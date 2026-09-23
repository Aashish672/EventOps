import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GeneralSettingsTab } from "../GeneralSettingsTab";
import { OrganizationContext, OrganizationContextType } from "../../../context/OrganizationContext";
import { Organization } from "../../../api/organizations";

const mockOrg: Organization = {
  id: "d83a1290-7c01-4475-9e6b-a25e1bb6f881",
  name: "Apex Event Agency",
  slug: "apex-event-agency",
  created_at: "2026-09-01T10:00:00Z",
};

const createMockContext = (activeOrg: Organization | null): OrganizationContextType => ({
  organizations: activeOrg ? [activeOrg] : [],
  activeOrg,
  members: [],
  currentUserRole: "owner",
  loading: false,
  membersLoading: false,
  error: null,
  isUnauthenticated: false,
  isCreateModalOpen: false,
  openCreateModal: vi.fn(),
  closeCreateModal: vi.fn(),
  setActiveOrg: vi.fn(),
  refreshOrganizations: vi.fn(),
  createOrg: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
});

describe("GeneralSettingsTab Component", () => {
  it("renders organization name, slug, tenant ID, and tier", () => {
    const ctx = createMockContext(mockOrg);
    render(
      <OrganizationContext.Provider value={ctx}>
        <GeneralSettingsTab />
      </OrganizationContext.Provider>
    );

    expect(screen.getByText("Apex Event Agency")).toBeInTheDocument();
    expect(screen.getByText("/apex-event-agency")).toBeInTheDocument();
    expect(screen.getByText("d83a1290-7c01-4475-9e6b-a25e1bb6f881")).toBeInTheDocument();
    expect(screen.getByText("FREE TIER")).toBeInTheDocument();
  });

  it("renders empty state when no organization is selected", () => {
    const ctx = createMockContext(null);
    render(
      <OrganizationContext.Provider value={ctx}>
        <GeneralSettingsTab />
      </OrganizationContext.Provider>
    );

    expect(screen.getByText("No Organization Selected")).toBeInTheDocument();
  });
});
