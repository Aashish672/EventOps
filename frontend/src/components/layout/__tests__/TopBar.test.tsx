import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TopBar } from "../TopBar";
import { OrganizationContext, OrganizationContextType } from "../../../context/OrganizationContext";
import { Organization } from "../../../api/organizations";

vi.mock("../../../api/client", () => ({
  fetchHealthCheck: vi.fn().mockResolvedValue({
    status: "healthy",
    service: "eventops-backend",
    timestamp: "2026-09-23T12:00:00Z",
    database: "connected",
    cache: "connected",
  }),
}));

const mockOrg: Organization = {
  id: "org-1234-uuid",
  name: "Apex Event Agency",
  slug: "apex-event-agency",
  created_at: "2026-09-01T10:00:00Z",
};

const createMockContext = (overrides: Partial<OrganizationContextType> = {}): OrganizationContextType => ({
  organizations: [mockOrg],
  activeOrg: mockOrg,
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
  ...overrides,
});

describe("TopBar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders EventOps brand name and active organization name", async () => {
    const ctx = createMockContext();
    await act(async () => {
      render(
        <OrganizationContext.Provider value={ctx}>
          <TopBar />
        </OrganizationContext.Provider>
      );
    });

    expect(screen.getByText("EventOps")).toBeInTheDocument();
    expect(screen.getByText("Apex Event Agency")).toBeInTheDocument();
    expect(screen.getByText("Alice Vance")).toBeInTheDocument();
  });

  it("opens organization selector dropdown and shows create button", async () => {
    const ctx = createMockContext();
    await act(async () => {
      render(
        <OrganizationContext.Provider value={ctx}>
          <TopBar />
        </OrganizationContext.Provider>
      );
    });

    const switcherBtn = screen.getByRole("button", { name: /select organization|apex event agency/i });
    fireEvent.click(switcherBtn);

    expect(screen.getByText(/organizations \(1\)/i)).toBeInTheDocument();
    const createBtn = screen.getByRole("button", { name: /create organization/i });
    expect(createBtn).toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(ctx.openCreateModal).toHaveBeenCalledTimes(1);
  });
});
