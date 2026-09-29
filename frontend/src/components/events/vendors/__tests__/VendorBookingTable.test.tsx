import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VendorBookingRow } from "../VendorBookingRow";
import { VendorBookingTable } from "../VendorBookingTable";
import { EventVendorsTab } from "../../tabs/EventVendorsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { VendorBooking, Vendor, Event } from "../../../../api/types";

// Mock useVendors hooks
const mockUpdateVendorBooking = vi.fn();

vi.mock("../../../../hooks/useVendors", () => ({
  useVendorBookings: vi.fn(),
  useVendors: vi.fn(),
  useUpdateVendorBooking: () => ({ mutateAsync: mockUpdateVendorBooking, isPending: false }),
  useCreateVendorBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteVendorBooking: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useVendorBookings, useVendors } from "../../../../hooks/useVendors";

const mockEvent: Event = {
  id: "evt-vtable-1",
  organization: "org-1",
  name: "Spring Gala 2026",
  description: "Spring gala event",
  start_date: "2026-05-15T18:00:00Z",
  end_date: "2026-05-15T23:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-vtable-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "vendors",
  refetch: vi.fn(),
};

const mockVendors: Vendor[] = [
  {
    id: "v-1",
    organization: "org-1",
    name: "Grand Ballroom Estate",
    category: "venue",
    email: "events@grandestate.com",
    phone: "(555) 234-5678",
    website: "https://grandestate.com",
    point_of_contact: "Eleanor Vance",
    notes: "Historic venue with courtyard",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "v-2",
    organization: "org-1",
    name: "Gourmet Creations Catering",
    category: "catering",
    email: "chef@gourmetcreations.com",
    phone: "(555) 345-6789",
    website: "https://gourmetcreations.com",
    point_of_contact: "Chef Marcus Reed",
    notes: "Farm to table organic catering",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "v-3",
    organization: "org-1",
    name: "Aura Moments Photography",
    category: "photography",
    email: "hello@auraphotos.com",
    phone: "(555) 456-7890",
    website: "https://auraphotos.com",
    point_of_contact: "Claire Bennett",
    notes: "Documentary style photography",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

const mockBookings: VendorBooking[] = [
  {
    id: "vb-1",
    event: "evt-vtable-1",
    vendor: "v-1",
    status: "booked",
    agreed_price: "7500.00",
    contract_notes: "Deposit paid. Full ballroom reserved.",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "vb-2",
    event: "evt-vtable-1",
    vendor: "v-2",
    status: "contract_sent",
    agreed_price: "4200.00",
    contract_notes: "Reviewing dietary menu options.",
    created_at: "2026-09-02T00:00:00Z",
    updated_at: "2026-09-02T00:00:00Z",
  },
  {
    id: "vb-3",
    event: "evt-vtable-1",
    vendor: "v-3",
    status: "inquiry",
    agreed_price: null,
    contract_notes: "Awaiting availability confirmation.",
    created_at: "2026-09-03T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
];

describe("VendorBookingRow Component (Sub-Task 3.6.2)", () => {
  it("renders vendor name, point of contact, category, price, and contract notes", () => {
    render(
      <table>
        <tbody>
          <VendorBookingRow booking={mockBookings[0]} vendor={mockVendors[0]} />
        </tbody>
      </table>
    );

    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.getByText("Eleanor Vance")).toBeInTheDocument();
    expect(screen.getByText("events@grandestate.com")).toBeInTheDocument();
    expect(screen.getByText("(555) 234-5678")).toBeInTheDocument();
    expect(screen.getByText("Venue")).toBeInTheDocument();
    expect(screen.getByText("$7,500.00")).toBeInTheDocument();
    expect(screen.getByText("Confirmed / Booked")).toBeInTheDocument();
    expect(screen.getByText("Deposit paid. Full ballroom reserved.")).toBeInTheDocument();
  });

  it("renders 'Price TBD' when agreed_price is null", () => {
    render(
      <table>
        <tbody>
          <VendorBookingRow booking={mockBookings[2]} vendor={mockVendors[2]} />
        </tbody>
      </table>
    );

    expect(screen.getByText("Price TBD")).toBeInTheDocument();
    expect(screen.getByText("Inquiry Sent")).toBeInTheDocument();
  });

  it("triggers onUpdateStatus when selecting a new status in the dropdown", () => {
    const mockStatusChange = vi.fn();
    render(
      <table>
        <tbody>
          <VendorBookingRow
            booking={mockBookings[1]}
            vendor={mockVendors[1]}
            onUpdateStatus={mockStatusChange}
          />
        </tbody>
      </table>
    );

    const select = screen.getByLabelText("Change status for Gourmet Creations Catering");
    fireEvent.change(select, { target: { value: "booked" } });

    expect(mockStatusChange).toHaveBeenCalledWith(mockBookings[1], "booked");
  });

  it("triggers onEditBooking and onDeleteBooking when clicking action buttons", () => {
    const mockEdit = vi.fn();
    const mockDelete = vi.fn();

    render(
      <table>
        <tbody>
          <VendorBookingRow
            booking={mockBookings[0]}
            vendor={mockVendors[0]}
            onEditBooking={mockEdit}
            onDeleteBooking={mockDelete}
          />
        </tbody>
      </table>
    );

    fireEvent.click(screen.getByLabelText("Edit booking for Grand Ballroom Estate"));
    expect(mockEdit).toHaveBeenCalledWith(mockBookings[0]);

    fireEvent.click(screen.getByLabelText("Delete booking for Grand Ballroom Estate"));
    expect(mockDelete).toHaveBeenCalledWith(mockBookings[0]);
  });
});

describe("VendorBookingTable Component (Sub-Task 3.6.2)", () => {
  it("renders empty state with 'Book First Vendor' CTA when bookings array is empty", () => {
    const mockAdd = vi.fn();
    render(
      <VendorBookingTable
        bookings={[]}
        vendors={mockVendors}
        onAddBooking={mockAdd}
      />
    );

    expect(screen.getByTestId("vendors-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No Vendors Booked")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /Book First Vendor/i });
    fireEvent.click(addBtn);
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it("renders table with all bookings joined with vendor directory data", () => {
    render(
      <VendorBookingTable
        bookings={mockBookings}
        vendors={mockVendors}
      />
    );

    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.getByText("Gourmet Creations Catering")).toBeInTheDocument();
    expect(screen.getByText("Aura Moments Photography")).toBeInTheDocument();

    // Verify filter pill counts
    expect(screen.getByRole("button", { name: "All (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Booked (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contract Sent (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inquiries (1)" })).toBeInTheDocument();
  });

  it("filters bookings via the search input (name, category, contact, notes)", () => {
    render(
      <VendorBookingTable
        bookings={mockBookings}
        vendors={mockVendors}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search vendors, contacts, notes/i);

    // Search by category
    fireEvent.change(searchInput, { target: { value: "catering" } });
    expect(screen.getByText("Gourmet Creations Catering")).toBeInTheDocument();
    expect(screen.queryByText("Grand Ballroom Estate")).toBeNull();
    expect(screen.queryByText("Aura Moments Photography")).toBeNull();

    // Search by contact
    fireEvent.change(searchInput, { target: { value: "Eleanor" } });
    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.queryByText("Gourmet Creations Catering")).toBeNull();

    // Search by notes
    fireEvent.change(searchInput, { target: { value: "dietary" } });
    expect(screen.getByText("Gourmet Creations Catering")).toBeInTheDocument();
    expect(screen.queryByText("Grand Ballroom Estate")).toBeNull();
  });

  it("filters bookings via status filter pills", () => {
    render(
      <VendorBookingTable
        bookings={mockBookings}
        vendors={mockVendors}
      />
    );

    // Click Booked pill
    fireEvent.click(screen.getByRole("button", { name: "Booked (1)" }));
    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.queryByText("Gourmet Creations Catering")).toBeNull();
    expect(screen.queryByText("Aura Moments Photography")).toBeNull();

    // Click Inquiries pill
    fireEvent.click(screen.getByRole("button", { name: "Inquiries (1)" }));
    expect(screen.getByText("Aura Moments Photography")).toBeInTheDocument();
    expect(screen.queryByText("Grand Ballroom Estate")).toBeNull();
  });

  it("renders 'No Matching Vendors' filter empty state and clears filters", () => {
    render(
      <VendorBookingTable
        bookings={mockBookings}
        vendors={mockVendors}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search vendors, contacts, notes/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent term" } });

    expect(screen.getByTestId("vendors-filter-empty")).toBeInTheDocument();
    expect(screen.getByText("No Matching Vendors")).toBeInTheDocument();

    // Clear filters
    const clearBtn = screen.getByRole("button", { name: "Clear Filters" });
    fireEvent.click(clearBtn);

    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.getByText("Gourmet Creations Catering")).toBeInTheDocument();
    expect(screen.getByText("Aura Moments Photography")).toBeInTheDocument();
  });
});

describe("EventVendorsTab Integration (Sub-Task 3.6.2)", () => {
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

  it("renders summary cards and bookings table together", () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
    (useVendors as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockVendors,
      isLoading: false,
    });

    renderWithProviders();

    // Summary cards exist
    expect(screen.getByTestId("kpi-vendor-total")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-vendor-booked")).toBeInTheDocument();

    // Table rows exist
    expect(screen.getByText("Grand Ballroom Estate")).toBeInTheDocument();
    expect(screen.getByText("Gourmet Creations Catering")).toBeInTheDocument();
    expect(screen.getByText("Aura Moments Photography")).toBeInTheDocument();
  });

  it("triggers update status mutation when selecting a new status in a row", async () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
    (useVendors as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockVendors,
      isLoading: false,
    });

    renderWithProviders();

    // Select status dropdown on second row
    const statusSelect = screen.getByLabelText("Change status for Gourmet Creations Catering");
    fireEvent.change(statusSelect, { target: { value: "booked" } });

    await waitFor(() => {
      expect(mockUpdateVendorBooking).toHaveBeenCalledWith({
        id: "vb-2",
        payload: { status: "booked" },
      });
    });
  });
});
