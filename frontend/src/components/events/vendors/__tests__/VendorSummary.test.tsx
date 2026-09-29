import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { calculateVendorSummary, formatCurrency } from "../vendorUtils";
import { VendorSummaryCards } from "../VendorSummaryCards";
import { EventVendorsTab } from "../../tabs/EventVendorsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { VendorBooking, Event } from "../../../../api/types";

// Mock useVendors hooks
vi.mock("../../../../hooks/useVendors", () => ({
  useVendorBookings: vi.fn(),
  useVendors: () => ({ data: [], isLoading: false }),
  useUpdateVendorBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateVendorBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteVendorBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useVendorBookings } from "../../../../hooks/useVendors";

const mockEvent: Event = {
  id: "evt-vendor-summary-1",
  organization: "org-1",
  name: "Annual Gala 2026",
  description: "Gala event",
  start_date: "2026-12-15T18:00:00Z",
  end_date: "2026-12-15T23:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-vendor-summary-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "vendors",
  refetch: vi.fn(),
};

const mockBookings: VendorBooking[] = [
  {
    id: "vb-1",
    event: "evt-vendor-summary-1",
    vendor: "v-1",
    status: "booked",
    agreed_price: "4500.00",
    contract_notes: "Deposit paid",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "vb-2",
    event: "evt-vendor-summary-1",
    vendor: "v-2",
    status: "booked",
    agreed_price: "2000.50",
    contract_notes: "Photography signed",
    created_at: "2026-09-02T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
  },
  {
    id: "vb-3",
    event: "evt-vendor-summary-1",
    vendor: "v-3",
    status: "inquiry",
    agreed_price: "1500.00",
    contract_notes: "Initial quote requested",
    created_at: "2026-09-03T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  {
    id: "vb-4",
    event: "evt-vendor-summary-1",
    vendor: "v-4",
    status: "contract_sent",
    agreed_price: "3000.00",
    contract_notes: "Contract under legal review",
    created_at: "2026-09-04T00:00:00Z",
    updated_at: "2026-09-04T00:00:00Z",
  },
  {
    id: "vb-5",
    event: "evt-vendor-summary-1",
    vendor: "v-5",
    status: "rejected",
    agreed_price: "8000.00",
    contract_notes: "Too expensive",
    created_at: "2026-09-05T00:00:00Z",
    updated_at: "2026-09-05T00:00:00Z",
  },
];

describe("vendorUtils (Sub-Task 3.6.1)", () => {
  it("calculates summary correctly for empty bookings array", () => {
    const summary = calculateVendorSummary([]);
    expect(summary).toEqual({
      totalBookings: 0,
      bookedCount: 0,
      inProgressCount: 0,
      rejectedCount: 0,
      contractedSpend: 0,
      pipelineSpend: 0,
      bookedPercentage: 0,
    });
  });

  it("calculates metrics, counts, and spend accurately across diverse statuses", () => {
    const summary = calculateVendorSummary(mockBookings);
    expect(summary.totalBookings).toBe(5);
    expect(summary.bookedCount).toBe(2);
    expect(summary.inProgressCount).toBe(2); // inquiry + contract_sent
    expect(summary.rejectedCount).toBe(1);
    expect(summary.contractedSpend).toBe(6500.5); // 4500 + 2000.50
    expect(summary.pipelineSpend).toBe(11000.5); // 4500 + 2000.50 + 1500 + 3000 (excludes rejected)
    expect(summary.bookedPercentage).toBe(40); // 2 / 5 = 40%
  });

  it("handles null or missing agreed_price gracefully", () => {
    const bookingsWithoutPrice: VendorBooking[] = [
      {
        id: "vb-6",
        event: "evt-1",
        vendor: "v-6",
        status: "booked",
        agreed_price: null,
        contract_notes: "",
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
    ];
    const summary = calculateVendorSummary(bookingsWithoutPrice);
    expect(summary.bookedCount).toBe(1);
    expect(summary.contractedSpend).toBe(0);
    expect(summary.pipelineSpend).toBe(0);
  });

  it("formats currency accurately with formatCurrency", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(1250.5)).toBe("$1,250.50");
    expect(formatCurrency("3400.00")).toBe("$3,400.00");
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency(undefined)).toBe("$0.00");
    expect(formatCurrency("invalid")).toBe("$0.00");
  });
});

describe("VendorSummaryCards Component (Sub-Task 3.6.1)", () => {
  it("renders 4 KPI cards with formatted values and subtexts", () => {
    const summary = calculateVendorSummary(mockBookings);
    render(<VendorSummaryCards summary={summary} />);

    // Total Bookings Card
    const totalCard = screen.getByTestId("kpi-vendor-total");
    expect(totalCard).toHaveTextContent("Total Bookings");
    expect(totalCard).toHaveTextContent("5");
    expect(totalCard).toHaveTextContent("2 confirmed • 2 in progress");

    // Confirmed / Booked Card
    const bookedCard = screen.getByTestId("kpi-vendor-booked");
    expect(bookedCard).toHaveTextContent("Confirmed / Booked");
    expect(bookedCard).toHaveTextContent("2");
    expect(bookedCard).toHaveTextContent("40% of vendor pipeline secured");

    // Inquiries & Contracts Card
    const inquiryCard = screen.getByTestId("kpi-vendor-inquiry");
    expect(inquiryCard).toHaveTextContent("Inquiries & Contracts");
    expect(inquiryCard).toHaveTextContent("2");
    expect(inquiryCard).toHaveTextContent("2 vendors awaiting contract or response");

    // Contracted Spend Card
    const spendCard = screen.getByTestId("kpi-vendor-spend");
    expect(spendCard).toHaveTextContent("Contracted Spend");
    expect(spendCard).toHaveTextContent("$6,500.50");
    expect(spendCard).toHaveTextContent("Pipeline estimate: $11,000.50");
  });
});

describe("EventVendorsTab Integration with VendorSummaryCards (Sub-Task 3.6.1)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EventContext.Provider value={mockEventContext}>
            <EventVendorsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders summary cards when bookings exist", () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });

    renderWithProviders();

    expect(screen.getByTestId("kpi-vendor-total")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-vendor-booked")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-vendor-inquiry")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-vendor-spend")).toBeInTheDocument();
  });

  it("renders summary cards with zeroes and displays empty state when no bookings exist", () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderWithProviders();

    // Summary cards render with zeroes
    expect(screen.getByTestId("kpi-vendor-total")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-vendor-spend")).toHaveTextContent("$0.00");

    // Empty state is displayed
    expect(screen.getByText("No Vendors Booked")).toBeInTheDocument();
  });
});
