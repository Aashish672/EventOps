import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookVendorModal } from "../BookVendorModal";
import { DeleteVendorBookingModal } from "../DeleteVendorBookingModal";
import { EventVendorsTab } from "../../tabs/EventVendorsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { VendorBooking, Vendor, Event } from "../../../../api/types";

// Mock mutations
const mockCreateVendorBooking = vi.fn();
const mockUpdateVendorBooking = vi.fn();
const mockDeleteVendorBooking = vi.fn();

vi.mock("../../../../hooks/useVendors", () => ({
  useVendorBookings: vi.fn(),
  useVendors: vi.fn(),
  useCreateVendorBooking: () => ({ mutateAsync: mockCreateVendorBooking, isPending: false }),
  useUpdateVendorBooking: () => ({ mutateAsync: mockUpdateVendorBooking, isPending: false }),
  useDeleteVendorBooking: () => ({ mutateAsync: mockDeleteVendorBooking, isPending: false }),
}));

import { useVendorBookings, useVendors } from "../../../../hooks/useVendors";

const mockEvent: Event = {
  id: "evt-book-modal-1",
  organization: "org-1",
  name: "Charity Gala 2026",
  description: "Gala event",
  start_date: "2026-12-15T18:00:00Z",
  end_date: "2026-12-15T23:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-book-modal-1",
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
    notes: "Farm to table catering",
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
    notes: "Documentary photography",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

const mockBookings: VendorBooking[] = [
  {
    id: "vb-1",
    event: "evt-book-modal-1",
    vendor: "v-1",
    status: "booked",
    agreed_price: "7500.00",
    contract_notes: "Deposit paid.",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

describe("BookVendorModal Component (Sub-Task 3.6.3)", () => {
  it("does not render when isOpen is false", () => {
    render(
      <BookVendorModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        vendors={mockVendors}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders in create mode and disables already-booked vendors", () => {
    render(
      <BookVendorModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        vendors={mockVendors}
        existingBookings={mockBookings}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book Vendor" })).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    // v-1 is already booked, so its option should be disabled
    const v1Option = options.find((opt) => opt.textContent?.includes("Grand Ballroom Estate"));
    expect(v1Option).toBeDisabled();
    expect(v1Option).toHaveTextContent("Already Booked");

    // v-2 is available, so it should be enabled and pre-selected
    const v2Option = options.find((opt) => opt.textContent?.includes("Gourmet Creations Catering"));
    expect(v2Option).not.toBeDisabled();
    expect(screen.getByLabelText(/Select Vendor/i)).toHaveValue("v-2");
  });

  it("renders in edit mode with pre-filled fields and disabled vendor selector", () => {
    render(
      <BookVendorModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        vendors={mockVendors}
        initialBooking={mockBookings[0]}
        existingBookings={mockBookings}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Vendor Booking" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Vendor/i)).toHaveValue("v-1");
    expect(screen.getByLabelText(/Select Vendor/i)).toBeDisabled(); // Cannot change vendor in edit mode
    expect(screen.getByLabelText(/Booking Status/i)).toHaveValue("booked");
    expect(screen.getByLabelText(/Agreed Cost/i)).toHaveValue(7500);
    expect(screen.getByLabelText(/Contract Notes/i)).toHaveValue("Deposit paid.");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("validates that agreed price must be non-negative", async () => {
    const mockSubmit = vi.fn();
    render(
      <BookVendorModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        vendors={mockVendors}
      />
    );

    fireEvent.change(screen.getByLabelText(/Agreed Cost/i), { target: { value: "-100" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Agreed price must be a valid positive number.");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits valid booking data and calls onClose on success", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <BookVendorModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={mockSubmit}
        vendors={mockVendors}
        existingBookings={mockBookings}
      />
    );

    fireEvent.change(screen.getByLabelText(/Select Vendor/i), { target: { value: "v-2" } });
    fireEvent.change(screen.getByLabelText(/Booking Status/i), { target: { value: "contract_sent" } });
    fireEvent.change(screen.getByLabelText(/Agreed Cost/i), { target: { value: "3500.50" } });
    fireEvent.change(screen.getByLabelText(/Contract Notes/i), { target: { value: "Tasting scheduled" } });

    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        vendor: "v-2",
        status: "contract_sent",
        agreed_price: "3500.50",
        contract_notes: "Tasting scheduled",
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error alert when onSubmit throws an error", async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error("Server error creating booking"));
    render(
      <BookVendorModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        vendors={mockVendors}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error creating booking");
    });
  });

  it("closes modal on Escape key press", () => {
    const mockClose = vi.fn();
    render(
      <BookVendorModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={vi.fn()}
        vendors={mockVendors}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("DeleteVendorBookingModal Component (Sub-Task 3.6.3)", () => {
  it("does not render when isOpen is false or booking is null", () => {
    const { rerender } = render(
      <DeleteVendorBookingModal
        isOpen={false}
        booking={mockBookings[0]}
        vendor={mockVendors[0]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <DeleteVendorBookingModal
        isOpen={true}
        booking={null}
        vendor={mockVendors[0]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders booking preview details and warning message", () => {
    render(
      <DeleteVendorBookingModal
        isOpen={true}
        booking={mockBookings[0]}
        vendor={mockVendors[0]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete Vendor Booking" })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove the booking for “Grand Ballroom Estate”\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Category: Venue • Status: Confirmed \/ Booked • Cost: \$7,500\.00/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone\. This vendor booking and all associated contract notes will be permanently removed\./i)
    ).toBeInTheDocument();
  });

  it("calls onConfirm and onClose when clicking delete button", async () => {
    const mockConfirm = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <DeleteVendorBookingModal
        isOpen={true}
        booking={mockBookings[0]}
        vendor={mockVendors[0]}
        onClose={mockClose}
        onConfirm={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Booking" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith("vb-1");
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error alert when onConfirm throws", async () => {
    const mockConfirm = vi.fn().mockRejectedValue(new Error("Deletion failed on server"));
    render(
      <DeleteVendorBookingModal
        isOpen={true}
        booking={mockBookings[0]}
        vendor={mockVendors[0]}
        onClose={vi.fn()}
        onConfirm={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Booking" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Deletion failed on server");
    });
  });
});

describe("EventVendorsTab Modal Integration (Sub-Task 3.6.3)", () => {
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

  it("opens BookVendorModal from header button and submits create mutation", async () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
    (useVendors as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockVendors,
      isLoading: false,
    });

    renderWithProviders();

    // Click header "Book Vendor"
    fireEvent.click(screen.getByRole("button", { name: /Book Vendor/i }));

    // Modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book Vendor" })).toBeInTheDocument();

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Agreed Cost/i), { target: { value: "4800.00" } });
    fireEvent.change(screen.getByLabelText(/Contract Notes/i), { target: { value: "Full menu tasting" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));

    await waitFor(() => {
      expect(mockCreateVendorBooking).toHaveBeenCalledWith({
        vendor: "v-2",
        status: "inquiry",
        agreed_price: "4800.00",
        contract_notes: "Full menu tasting",
        event: "evt-book-modal-1",
      });
    });
  });

  it("opens BookVendorModal in edit mode from row action and submits update mutation", async () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
    (useVendors as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockVendors,
      isLoading: false,
    });

    renderWithProviders();

    // Click edit on the row
    fireEvent.click(screen.getByLabelText("Edit booking for Grand Ballroom Estate"));

    // Modal opens in edit mode
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit Vendor Booking" })).toBeInTheDocument();

    // Change notes and submit
    fireEvent.change(screen.getByLabelText(/Contract Notes/i), { target: { value: "Updated contract terms." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateVendorBooking).toHaveBeenCalledWith({
        id: "vb-1",
        payload: {
          vendor: "v-1",
          status: "booked",
          agreed_price: "7500.00",
          contract_notes: "Updated contract terms.",
          event: "evt-book-modal-1",
        },
      });
    });
  });

  it("opens DeleteVendorBookingModal from row action and deletes booking", async () => {
    (useVendorBookings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
    (useVendors as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockVendors,
      isLoading: false,
    });

    renderWithProviders();

    // Click delete on the row
    fireEvent.click(screen.getByLabelText("Delete booking for Grand Ballroom Estate"));

    // Modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete Vendor Booking" })).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByRole("button", { name: "Delete Booking" }));

    await waitFor(() => {
      expect(mockDeleteVendorBooking).toHaveBeenCalledWith("vb-1");
    });
  });
});
