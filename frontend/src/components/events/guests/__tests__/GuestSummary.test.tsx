import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { calculateGuestSummary } from "../guestUtils";
import { GuestSummaryCards } from "../GuestSummaryCards";
import { EventGuestsTab } from "../../tabs/EventGuestsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Guest, GuestHousehold, Event } from "../../../../api/types";

// Mock useGuests hooks
vi.mock("../../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuests: vi.fn(),
  useCreateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useHouseholds, useGuests } from "../../../../hooks/useGuests";

const mockEvent: Event = {
  id: "evt-guests-1",
  organization: "org-1",
  name: "Tech Summit 2026",
  description: "Annual summit",
  start_date: "2026-11-15T09:00:00Z",
  end_date: "2026-11-15T18:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-guests-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "guests",
  refetch: vi.fn(),
};

const mockHouseholds: GuestHousehold[] = [
  {
    id: "hh-1",
    event: "evt-guests-1",
    name: "The Anderson Family",
    address: "123 Elm St",
    email: "anderson@example.com",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "hh-2",
    event: "evt-guests-1",
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
    event: "evt-guests-1",
    first_name: "Alice",
    last_name: "Anderson",
    rsvp_status: "attending",
    dietary_restrictions: "Vegan, nut allergy",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "g-2",
    household: "hh-1",
    event: "evt-guests-1",
    first_name: "Bob",
    last_name: "Anderson",
    rsvp_status: "attending",
    dietary_restrictions: "",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "g-3",
    household: "hh-2",
    event: "evt-guests-1",
    first_name: "Charlie",
    last_name: "Baker",
    rsvp_status: "declined",
    dietary_restrictions: "",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "g-4",
    household: "hh-2",
    event: "evt-guests-1",
    first_name: "Diana",
    last_name: "Baker",
    rsvp_status: "pending",
    dietary_restrictions: "Gluten-free",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

describe("Guest Summary Utilities (calculateGuestSummary)", () => {
  it("calculates zero counts when arrays are empty", () => {
    const summary = calculateGuestSummary([], []);
    expect(summary.totalGuests).toBe(0);
    expect(summary.totalHouseholds).toBe(0);
    expect(summary.attendingCount).toBe(0);
    expect(summary.declinedCount).toBe(0);
    expect(summary.pendingCount).toBe(0);
    expect(summary.attendingPercent).toBe(0);
    expect(summary.responseRatePercent).toBe(0);
    expect(summary.dietaryRestrictionsCount).toBe(0);
  });

  it("correctly breaks down attending, declined, and pending RSVPs", () => {
    const summary = calculateGuestSummary(mockGuests, mockHouseholds);
    expect(summary.totalGuests).toBe(4);
    expect(summary.totalHouseholds).toBe(2);
    expect(summary.attendingCount).toBe(2);
    expect(summary.declinedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.attendingPercent).toBe(50); // 2 out of 4 = 50%
    expect(summary.responseRatePercent).toBe(75); // 3 out of 4 responded = 75%
    expect(summary.dietaryRestrictionsCount).toBe(2); // Alice and Diana
  });

  it("handles 100% attendance rate", () => {
    const allAttending: Guest[] = [
      { ...mockGuests[0], rsvp_status: "attending" },
      { ...mockGuests[1], rsvp_status: "attending" },
    ];
    const summary = calculateGuestSummary(allAttending, [mockHouseholds[0]]);
    expect(summary.attendingPercent).toBe(100);
    expect(summary.responseRatePercent).toBe(100);
    expect(summary.pendingCount).toBe(0);
    expect(summary.declinedCount).toBe(0);
  });
});

describe("GuestSummaryCards Component", () => {
  it("renders all 4 KPI cards with correct metrics", () => {
    const summary = calculateGuestSummary(mockGuests, mockHouseholds);
    render(<GuestSummaryCards summary={summary} />);

    expect(screen.getByTestId("kpi-total-guests")).toHaveTextContent("4");
    expect(screen.getByTestId("kpi-total-guests")).toHaveTextContent("Across 2 households");

    expect(screen.getByTestId("kpi-attending")).toHaveTextContent("2");
    expect(screen.getByTestId("kpi-attending")).toHaveTextContent("50% confirmed");

    expect(screen.getByTestId("kpi-pending")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-pending")).toHaveTextContent("Awaiting response");

    expect(screen.getByTestId("kpi-declined")).toHaveTextContent("1");
    expect(screen.getByTestId("kpi-declined")).toHaveTextContent("Unable to attend");
  });

  it("renders dietary notification banner when restrictions exist", () => {
    const summary = calculateGuestSummary(mockGuests, mockHouseholds);
    render(<GuestSummaryCards summary={summary} />);

    const banner = screen.getByTestId("dietary-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("2 guests have dietary restrictions recorded.");
  });

  it("does not render dietary banner when no dietary restrictions exist", () => {
    const noDietary = mockGuests.map((g) => ({ ...g, dietary_restrictions: "" }));
    const summary = calculateGuestSummary(noDietary, mockHouseholds);
    render(<GuestSummaryCards summary={summary} />);

    expect(screen.queryByTestId("dietary-banner")).not.toBeInTheDocument();
  });

  it("renders singular wording for single household and single dietary restriction", () => {
    const singleGuest = [mockGuests[0]];
    const singleHousehold = [mockHouseholds[0]];
    const summary = calculateGuestSummary(singleGuest, singleHousehold);
    render(<GuestSummaryCards summary={summary} />);

    expect(screen.getByTestId("kpi-total-guests")).toHaveTextContent("Across 1 household");
    expect(screen.getByTestId("dietary-banner")).toHaveTextContent("1 guest has dietary restrictions recorded.");
  });
});

describe("EventGuestsTab Integration with Summary Cards", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
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

  it("renders loading state when data is being fetched", () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = renderTab();
    expect(container.querySelector(".placeholder-pulse")).toBeInTheDocument();
  });

  it("renders KPI summary cards and empty state when no households exist", () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderTab();

    expect(screen.getByTestId("kpi-total-guests")).toHaveTextContent("0");
    expect(screen.getByText("No Guest Households Added")).toBeInTheDocument();
  });

  it("renders KPI summary cards and household preview items when households exist", () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockGuests,
      isLoading: false,
    });

    renderTab();

    expect(screen.getByTestId("kpi-total-guests")).toHaveTextContent("4");
    expect(screen.getByTestId("kpi-attending")).toHaveTextContent("2");
    expect(screen.getByText("The Anderson Family")).toBeInTheDocument();
    expect(screen.getByText("The Baker Household")).toBeInTheDocument();
  });
});
