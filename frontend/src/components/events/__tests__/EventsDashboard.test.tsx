import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventCard } from "../EventCard";
import { EventList } from "../EventList";
import { CreateEventModal } from "../CreateEventModal";
import { EventsDashboard } from "../EventsDashboard";
import { OrganizationContext, OrganizationContextType } from "../../../context/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Event } from "../../../api/types";
import { Organization, Membership } from "../../../api/organizations";

const mockOrg: Organization = {
  id: "org-uuid-1",
  name: "Apex Events Agency",
  slug: "apex-events-agency",
  created_at: "2026-09-01T10:00:00Z",
};

const mockMembers: Membership[] = [
  {
    id: "mem-1",
    user_id: 10,
    username: "sarah_planner",
    email: "sarah@apex.com",
    role: "planner",
    joined_at: "2026-09-01T10:00:00Z",
  },
];

const mockEvents: Event[] = [
  {
    id: "event-1",
    organization: "org-uuid-1",
    name: "Summit Keynote 2026",
    description: "Annual leadership keynote summit",
    start_date: "2026-10-15T09:00:00Z",
    end_date: "2026-10-15T17:00:00Z",
    status: "active",
    assigned_planner: 10,
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
  },
  {
    id: "event-2",
    organization: "org-uuid-1",
    name: "Gala Dinner",
    description: "Charity fundraising gala",
    start_date: "2026-11-01T18:00:00Z",
    end_date: "2026-11-01T23:00:00Z",
    status: "draft",
    assigned_planner: null,
    created_at: "2026-09-21T10:00:00Z",
    updated_at: "2026-09-21T10:00:00Z",
  },
];

const createMockOrgContext = (
  activeOrg: Organization | null = mockOrg
): OrganizationContextType => ({
  organizations: activeOrg ? [activeOrg] : [],
  activeOrg,
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
});

function renderWithProviders(
  ui: React.ReactElement,
  orgContext = createMockOrgContext()
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationContext.Provider value={orgContext}>
        <MemoryRouter>{ui}</MemoryRouter>
      </OrganizationContext.Provider>
    </QueryClientProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("EventCard Component", () => {
  it("renders event details, formatted status, and assigned planner", () => {
    const handleClick = vi.fn();
    render(
      <EventCard
        event={mockEvents[0]}
        onClick={handleClick}
        members={mockMembers}
      />
    );

    expect(screen.getByText("Summit Keynote 2026")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("sarah_planner")).toBeInTheDocument();
    expect(
      screen.getByText("Annual leadership keynote summit")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open event: summit keynote 2026/i }));
    expect(handleClick).toHaveBeenCalledWith("event-1");
  });

  it("handles unassigned planner gracefully", () => {
    const handleClick = vi.fn();
    render(
      <EventCard
        event={mockEvents[1]}
        onClick={handleClick}
        members={mockMembers}
      />
    );

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});

describe("EventList Component", () => {
  it("renders multiple event cards and status counts", () => {
    render(
      <EventList
        events={mockEvents}
        isLoading={false}
        error={null}
        onSelectEvent={vi.fn()}
        onCreateClick={vi.fn()}
        members={mockMembers}
      />
    );

    expect(screen.getByText("Summit Keynote 2026")).toBeInTheDocument();
    expect(screen.getByText("Gala Dinner")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all/i })).toHaveTextContent("2");
  });

  it("filters events by search query", () => {
    render(
      <EventList
        events={mockEvents}
        isLoading={false}
        error={null}
        onSelectEvent={vi.fn()}
        onCreateClick={vi.fn()}
        members={mockMembers}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search events/i);
    fireEvent.change(searchInput, { target: { value: "Gala" } });

    expect(screen.queryByText("Summit Keynote 2026")).not.toBeInTheDocument();
    expect(screen.getByText("Gala Dinner")).toBeInTheDocument();
  });

  it("filters events by status pill", () => {
    render(
      <EventList
        events={mockEvents}
        isLoading={false}
        error={null}
        onSelectEvent={vi.fn()}
        onCreateClick={vi.fn()}
        members={mockMembers}
      />
    );

    const draftPill = screen.getByRole("tab", { name: /draft/i });
    fireEvent.click(draftPill);

    expect(screen.queryByText("Summit Keynote 2026")).not.toBeInTheDocument();
    expect(screen.getByText("Gala Dinner")).toBeInTheDocument();
  });

  it("shows empty state when no events exist", () => {
    const handleCreate = vi.fn();
    render(
      <EventList
        events={[]}
        isLoading={false}
        error={null}
        onSelectEvent={vi.fn()}
        onCreateClick={handleCreate}
        members={mockMembers}
      />
    );

    expect(screen.getByText(/no events created yet/i)).toBeInTheDocument();
    const createBtn = screen.getByRole("button", { name: /create event/i });
    fireEvent.click(createBtn);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });
});

describe("CreateEventModal Component", () => {
  it("validates required name field before submission", async () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <CreateEventModal
        isOpen={true}
        onClose={handleClose}
        organizationId="org-uuid-1"
        members={mockMembers}
      />
    );

    expect(screen.getByText("Create New Event")).toBeInTheDocument();

    // Clear auto-populated dates or submit empty name
    const submitBtn = screen.getByRole("button", { name: "Create Event" });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/event name is required/i)).toBeInTheDocument();
  });

  it("validates that end date cannot be earlier than start date", async () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <CreateEventModal
        isOpen={true}
        onClose={handleClose}
        organizationId="org-uuid-1"
        members={mockMembers}
      />
    );

    const nameInput = screen.getByLabelText(/event name/i);
    fireEvent.change(nameInput, { target: { value: "Test Event" } });

    const startDateInput = screen.getByLabelText(/start date & time/i);
    const endDateInput = screen.getByLabelText(/end date & time/i);

    fireEvent.change(startDateInput, { target: { value: "2026-10-20T10:00" } });
    fireEvent.change(endDateInput, { target: { value: "2026-10-19T10:00" } }); // earlier than start

    const submitBtn = screen.getByRole("button", { name: "Create Event" });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/end date and time cannot be earlier than start date/i)
    ).toBeInTheDocument();
  });
});

describe("EventsDashboard Component", () => {
  it("renders the dashboard header and create event trigger", async () => {
    renderWithProviders(<EventsDashboard />);

    expect(screen.getByRole("heading", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByText("Apex Events Agency")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create event/i })).toBeInTheDocument();
  });

  it("shows no-org state when no active organization exists", () => {
    renderWithProviders(<EventsDashboard />, createMockOrgContext(null));

    expect(screen.getByText(/no organization selected/i)).toBeInTheDocument();
  });
});
