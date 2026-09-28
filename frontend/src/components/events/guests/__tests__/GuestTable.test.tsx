import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventGuestsTab } from "../../tabs/EventGuestsTab";
import { GuestHouseholdAccordion } from "../GuestHouseholdAccordion";
import { GuestRow } from "../GuestRow";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Guest, GuestHousehold, Event } from "../../../../api/types";

// Mock useGuests hooks
const mockMutateAsync = vi.fn();

vi.mock("../../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuests: vi.fn(),
  useCreateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGuest: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useHouseholds, useGuests } from "../../../../hooks/useGuests";

const mockEvent: Event = {
  id: "evt-guests-2",
  organization: "org-1",
  name: "Spring Tech Summit 2026",
  description: "Summit description",
  start_date: "2026-05-10T10:00:00Z",
  end_date: "2026-05-10T18:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-guests-2",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "guests",
  refetch: vi.fn(),
};

const mockHouseholds: GuestHousehold[] = [
  {
    id: "hh-1",
    event: "evt-guests-2",
    name: "The Anderson Family",
    address: "123 Elm St",
    email: "anderson@example.com",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "hh-2",
    event: "evt-guests-2",
    name: "The Baker Household",
    address: "456 Oak Rd",
    email: "baker@example.com",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

const mockGuests: Guest[] = [
  {
    id: "g-1",
    household: "hh-1",
    event: "evt-guests-2",
    first_name: "Alice",
    last_name: "Anderson",
    rsvp_status: "attending",
    dietary_restrictions: "Vegan",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "g-2",
    household: "hh-1",
    event: "evt-guests-2",
    first_name: "Bob",
    last_name: "Anderson",
    rsvp_status: "pending",
    dietary_restrictions: "",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "g-3",
    household: "hh-2",
    event: "evt-guests-2",
    first_name: "Charlie",
    last_name: "Baker",
    rsvp_status: "declined",
    dietary_restrictions: "Peanut allergy",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

describe("GuestRow Component", () => {
  it("renders guest name, attending badge, and dietary notes", () => {
    render(
      <table>
        <tbody>
          <GuestRow guest={mockGuests[0]} />
        </tbody>
      </table>
    );

    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Attending")).toBeInTheDocument();
    expect(screen.getByText("Vegan")).toBeInTheDocument();
  });

  it("calls onUpdateStatus when status select option changes", () => {
    const handleStatus = vi.fn();
    render(
      <table>
        <tbody>
          <GuestRow guest={mockGuests[1]} onUpdateStatus={handleStatus} />
        </tbody>
      </table>
    );

    const select = screen.getByLabelText("Update RSVP status for Bob Anderson");
    fireEvent.change(select, { target: { value: "attending" } });

    expect(handleStatus).toHaveBeenCalledWith(mockGuests[1], "attending");
  });
});

describe("GuestHouseholdAccordion Component", () => {
  it("renders household name, email, guest count, and member table when expanded", () => {
    render(
      <GuestHouseholdAccordion
        household={mockHouseholds[0]}
        guests={[mockGuests[0], mockGuests[1]]}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText("The Anderson Family")).toBeInTheDocument();
    expect(screen.getByText("anderson@example.com")).toBeInTheDocument();
    expect(screen.getByText("2 guests")).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Bob Anderson")).toBeInTheDocument();
  });

  it("renders empty state inside household when no guests exist", () => {
    render(
      <GuestHouseholdAccordion
        household={mockHouseholds[0]}
        guests={[]}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    expect(
      screen.getByText("No guests have been added to this household yet.")
    ).toBeInTheDocument();
  });
});

describe("EventGuestsTab Household & Guest Management (Sub-Task 3.5.2)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockGuests,
      isLoading: false,
    });
  });

  const renderTab = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventContext.Provider value={mockEventContext}>
            <EventGuestsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders household accordion cards with member guests visible by default", () => {
    renderTab();

    expect(screen.getByText("The Anderson Family")).toBeInTheDocument();
    expect(screen.getByText("The Baker Household")).toBeInTheDocument();
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Charlie Baker")).toBeInTheDocument();
  });

  it("toggles expand and collapse of household accordion", () => {
    renderTab();

    const expandBtn = screen.getByLabelText("Toggle The Anderson Family household members");
    expect(expandBtn).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Alice Anderson")).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
  });

  it("collapses and expands all households with the toggle button", () => {
    renderTab();

    const toggleAllBtn = screen.getByRole("button", { name: /Collapse all households/i });
    expect(toggleAllBtn).toHaveTextContent("Collapse All");

    // Collapse All
    fireEvent.click(toggleAllBtn);
    expect(screen.queryByText("Alice Anderson")).not.toBeInTheDocument();
    expect(screen.queryByText("Charlie Baker")).not.toBeInTheDocument();
    expect(toggleAllBtn).toHaveTextContent("Expand All");

    // Expand All
    fireEvent.click(toggleAllBtn);
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.getByText("Charlie Baker")).toBeInTheDocument();
  });

  it("filters households and member guests by search query", () => {
    renderTab();

    const searchInput = screen.getByLabelText("Search households or guests");
    fireEvent.change(searchInput, { target: { value: "Charlie" } });

    // Charlie Baker should be visible, Anderson should not match
    expect(screen.getByText("Charlie Baker")).toBeInTheDocument();
    expect(screen.queryByText("Alice Anderson")).not.toBeInTheDocument();
  });

  it("filters by RSVP status buttons", () => {
    renderTab();

    // Click "Attending" filter button
    const attendingFilterBtn = screen.getByRole("button", { name: /Attending \(1\)/i });
    fireEvent.click(attendingFilterBtn);

    // Only Alice Anderson is attending
    expect(screen.getByText("Alice Anderson")).toBeInTheDocument();
    expect(screen.queryByText("Charlie Baker")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Anderson")).not.toBeInTheDocument();
  });

  it("updates guest RSVP status and triggers mutation", async () => {
    mockMutateAsync.mockResolvedValueOnce({ ...mockGuests[1], rsvp_status: "attending" });
    renderTab();

    const select = screen.getByLabelText("Update RSVP status for Bob Anderson");
    fireEvent.change(select, { target: { value: "attending" } });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: "g-2",
        payload: { rsvp_status: "attending" },
      });
    });
  });

  it("shows empty state when search produces no matching households", () => {
    renderTab();

    const searchInput = screen.getByLabelText("Search households or guests");
    fireEvent.change(searchInput, { target: { value: "NonExistentGuest" } });

    expect(screen.getByText("No Matching Guests or Households")).toBeInTheDocument();
  });
});
