import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventLayout } from "../EventLayout";
import { EventOverviewTab } from "../tabs/EventOverviewTab";
import { EventTimelineTab } from "../tabs/EventTimelineTab";
import { EventBudgetTab } from "../tabs/EventBudgetTab";
import { EventGuestsTab } from "../tabs/EventGuestsTab";
import { EventVendorsTab } from "../tabs/EventVendorsTab";
import { EventProvider } from "../../../context/EventProvider";
import { useEventContext } from "../../../context/useEventContext";
import { OrganizationContext, OrganizationContextType } from "../../../context/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Event, Task, BudgetCategory, GuestHousehold, VendorBooking } from "../../../api/types";
import { Membership } from "../../../api/organizations";

// Mock API hooks
vi.mock("../../../hooks/useEvents", () => ({
  useEvent: vi.fn(),
}));

vi.mock("../../../hooks/useTasks", () => ({
  useTasks: vi.fn(),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuestHouseholds: vi.fn(),
}));

vi.mock("../../../hooks/useVendors", () => ({
  useVendorBookings: vi.fn(),
}));

import { useEvent } from "../../../hooks/useEvents";
import { useTasks } from "../../../hooks/useTasks";
import { useBudgetCategories } from "../../../hooks/useBudgets";
import { useHouseholds, useGuestHouseholds } from "../../../hooks/useGuests";
import { useVendorBookings } from "../../../hooks/useVendors";

const mockEvent: Event = {
  id: "evt-100",
  organization: "org-1",
  name: "Annual Gala 2026",
  description: "A prestigious fundraising gala evening",
  start_date: "2026-10-15T18:00:00Z",
  end_date: "2026-10-15T23:00:00Z",
  status: "planning",
  assigned_planner: 10,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

const mockTasks: Task[] = [
  {
    id: "task-1",
    event: "evt-100",
    title: "Book caterer",
    description: "Finalize dietary preferences",
    due_date: "2026-10-01T12:00:00Z",
    status: "done",
    assigned_to: 10,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "task-2",
    event: "evt-100",
    title: "Send invitations",
    description: "Mail invitation cards",
    due_date: "2026-10-05T12:00:00Z",
    status: "in_progress",
    assigned_to: 10,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockBudgetCategories: BudgetCategory[] = [
  {
    id: "cat-1",
    event: "evt-100",
    name: "Venue & Catering",
    allocated_amount: "15000.00",
    line_items: [
      {
        id: "item-1",
        category: "cat-1",
        event: "evt-100",
        description: "Ballroom deposit",
        estimated_cost: "5000.00",
        actual_cost: "4500.00",
        is_paid: true,
        created_at: "2026-09-01T10:00:00Z",
        updated_at: "2026-09-01T10:00:00Z",
      },
    ],
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockHouseholds: GuestHousehold[] = [
  {
    id: "hh-1",
    event: "evt-100",
    name: "The Wayne Family",
    address: "1007 Mountain Drive",
    email: "bruce@waynecorp.com",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockVendorBookings: VendorBooking[] = [
  {
    id: "booking-1",
    event: "evt-100",
    vendor: "vendor-1",
    status: "booked",
    agreed_price: "4500.00",
    contract_notes: "Includes sound equipment",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

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

const mockOrgContext: OrganizationContextType = {
  organizations: [],
  activeOrg: { id: "org-1", name: "Apex Agency", slug: "apex", created_at: "" },
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
};

function renderWithProviders(
  initialRoute = "/events/evt-100",
  orgContext = mockOrgContext
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationContext.Provider value={orgContext}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/events" element={<div>All Events List</div>} />
            <Route
              path="/events/:eventId"
              element={
                <EventProvider>
                  <EventLayout />
                </EventProvider>
              }
            >
              <Route index element={<EventOverviewTab />} />
              <Route path="overview" element={<EventOverviewTab />} />
              <Route path="timeline" element={<EventTimelineTab />} />
              <Route path="budget" element={<EventBudgetTab />} />
              <Route path="guests" element={<EventGuestsTab />} />
              <Route path="vendors" element={<EventVendorsTab />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </OrganizationContext.Provider>
    </QueryClientProvider>
  );
}

describe("EventLayout and Routing (Epic 3.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useEvent as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockEvent,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    (useTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: mockTasks, isLoading: false });
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: mockBudgetCategories, isLoading: false });
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: mockHouseholds, isLoading: false });
    (useGuestHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: mockHouseholds, isLoading: false });
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: mockVendorBookings, isLoading: false });
  });

  it("renders loading skeleton when event is loading", () => {
    (useEvent as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders();
    expect(container.querySelector(".placeholder-pulse")).toBeInTheDocument();
  });

  it("renders error state when event fetch fails", () => {
    (useEvent as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Unauthorized event access"),
      refetch: vi.fn(),
    });

    renderWithProviders();
    expect(screen.getByText("Event Not Found")).toBeInTheDocument();
    expect(screen.getByText("Unauthorized event access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Events/i })).toBeInTheDocument();
  });

  it("renders event header with title, status, planner, and dates", () => {
    renderWithProviders();

    expect(screen.getByRole("heading", { level: 1, name: "Annual Gala 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("PLANNING").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("sarah@apex.com")).toBeInTheDocument();
    expect(screen.getAllByText(/A prestigious fundraising gala evening/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders all 5 sub-navigation tabs", () => {
    renderWithProviders();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Timeline & Tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Budget Tracker/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Guests/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Vendors/i })).toBeInTheDocument();
  });

  it("navigates between sub-tabs when tab buttons are clicked", () => {
    renderWithProviders();

    // Default route renders Overview
    expect(screen.getByText("Event Information")).toBeInTheDocument();

    // Click Timeline tab
    fireEvent.click(screen.getByRole("tab", { name: /Timeline & Tasks/i }));
    expect(screen.getByRole("heading", { level: 2, name: "Timeline & Tasks" })).toBeInTheDocument();

    // Click Budget tab
    fireEvent.click(screen.getByRole("tab", { name: /Budget Tracker/i }));
    expect(screen.getByRole("heading", { level: 2, name: "Budget Tracker" })).toBeInTheDocument();

    // Click Guests tab
    fireEvent.click(screen.getByRole("tab", { name: /Guests/i }));
    expect(screen.getByRole("heading", { level: 2, name: /Guest Households/i })).toBeInTheDocument();

    // Click Vendors tab
    fireEvent.click(screen.getByRole("tab", { name: /Vendors/i }));
    expect(screen.getByRole("heading", { level: 2, name: "Vendor Bookings" })).toBeInTheDocument();
  });

  it("navigates back to /events when clicking Back to Events button", () => {
    renderWithProviders();

    const backBtn = screen.getByRole("button", { name: /Back to all events/i });
    fireEvent.click(backBtn);

    expect(screen.getByText("All Events List")).toBeInTheDocument();
  });

  it("renders live KPI metrics in EventOverviewTab", () => {
    renderWithProviders();

    // Tasks metric: 1 / 2 completed
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText(/50% completed/i)).toBeInTheDocument();

    // Budget metric: $15,000 allocated
    expect(screen.getByText("$15,000.00")).toBeInTheDocument();
    expect(screen.getByText(/\$4,500.00 spent/i)).toBeInTheDocument();

    // Guest households metric: 1
    expect(screen.getByText("1 household registered")).toBeInTheDocument();

    // Vendors metric: 1 confirmed
    expect(screen.getByText(/1 confirmed/i)).toBeInTheDocument();
  });

  it("throws error when useEventContext is accessed outside EventProvider", () => {
    const TestConsumer = () => {
      useEventContext();
      return <div>Should not render</div>;
    };

    // Prevent React error boundary logs in test output
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useEventContext must be used within an EventProvider"
    );

    consoleError.mockRestore();
  });
});
