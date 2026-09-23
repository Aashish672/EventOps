import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MembersTab } from "../MembersTab";
import { OrganizationContext, OrganizationContextType } from "../../../context/OrganizationContext";
import { Membership, Organization } from "../../../api/organizations";

const mockOrg: Organization = {
  id: "org-1234-uuid",
  name: "Apex Event Agency",
  slug: "apex-event-agency",
  created_at: "2026-09-01T10:00:00Z",
};

const mockMembers: Membership[] = [
  {
    id: "mem-1",
    user_id: 1,
    username: "alice_vance",
    email: "alice@apexevents.com",
    role: "owner",
    joined_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "mem-2",
    user_id: 2,
    username: "marcus_reed",
    email: "marcus@apexevents.com",
    role: "planner",
    joined_at: "2026-09-05T11:00:00Z",
  },
];

const createMockContext = (overrides: Partial<OrganizationContextType> = {}): OrganizationContextType => ({
  organizations: [mockOrg],
  activeOrg: mockOrg,
  members: mockMembers,
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

const renderWithContext = (contextValue: OrganizationContextType) => {
  return render(
    <OrganizationContext.Provider value={contextValue}>
      <MembersTab />
    </OrganizationContext.Provider>
  );
};

describe("MembersTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders member list with username, email, and uppercase role badges", () => {
    const ctx = createMockContext();
    renderWithContext(ctx);

    expect(screen.getByText("alice_vance")).toBeInTheDocument();
    expect(screen.getByText("alice@apexevents.com")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();

    expect(screen.getByText("marcus_reed")).toBeInTheDocument();
    expect(screen.getByText("marcus@apexevents.com")).toBeInTheDocument();
    expect(screen.getByText("PLANNER")).toBeInTheDocument();
  });

  it("enables Invite Member button for owner role", () => {
    const ctx = createMockContext({ currentUserRole: "owner" });
    renderWithContext(ctx);

    const inviteBtn = screen.getByRole("button", { name: /invite member/i });
    expect(inviteBtn).toBeEnabled();
  });

  it("disables Invite Member button for non-owner roles", () => {
    const ctx = createMockContext({ currentUserRole: "planner" });
    renderWithContext(ctx);

    const inviteBtn = screen.getByRole("button", { name: /invite member/i });
    expect(inviteBtn).toBeDisabled();
    expect(inviteBtn).toHaveAttribute("title", "Only organization owners can invite new members");
  });

  it("filters members when user types in search input", () => {
    const ctx = createMockContext();
    renderWithContext(ctx);

    const searchInput = screen.getByPlaceholderText(/filter members/i);
    fireEvent.change(searchInput, { target: { value: "marcus" } });

    expect(screen.getByText("marcus_reed")).toBeInTheDocument();
    expect(screen.queryByText("alice_vance")).not.toBeInTheDocument();
  });

  it("disables remove button for sole owner", () => {
    const singleOwnerMembers: Membership[] = [
      {
        id: "mem-1",
        user_id: 1,
        username: "alice_vance",
        email: "alice@apexevents.com",
        role: "owner",
        joined_at: "2026-09-01T10:00:00Z",
      },
      {
        id: "mem-2",
        user_id: 2,
        username: "marcus_reed",
        email: "marcus@apexevents.com",
        role: "planner",
        joined_at: "2026-09-05T11:00:00Z",
      },
    ];

    const ctx = createMockContext({ members: singleOwnerMembers, currentUserRole: "owner" });
    renderWithContext(ctx);

    // Alice is sole owner, her remove button must be disabled
    const aliceRemoveBtn = screen.getByRole("button", { name: "Remove alice_vance" });
    expect(aliceRemoveBtn).toBeDisabled();
    expect(aliceRemoveBtn).toHaveAttribute("title", "Sole owner cannot be removed");

    // Marcus is planner, remove button must be enabled
    const marcusRemoveBtn = screen.getByRole("button", { name: "Remove marcus_reed" });
    expect(marcusRemoveBtn).toBeEnabled();
  });

  it("displays authentication required prompt when user is unauthenticated", () => {
    const ctx = createMockContext({
      activeOrg: null,
      isUnauthenticated: true,
      error: "Authentication required: Please log in to view organizations.",
    });
    renderWithContext(ctx);

    expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    expect(screen.getByText(/you must be authenticated to access organization resources/i)).toBeInTheDocument();
  });

  it("displays empty state when organization has no members", () => {
    const ctx = createMockContext({ members: [] });
    renderWithContext(ctx);

    expect(screen.getByText(/no members found/i)).toBeInTheDocument();
  });
});
