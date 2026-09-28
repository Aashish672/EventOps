import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestModal } from "../GuestModal";
import { EventGuestsTab } from "../../tabs/EventGuestsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { GuestHousehold, Guest, Event } from "../../../../api/types";

// Mock mutations
const mockCreateGuest = vi.fn();
const mockUpdateGuest = vi.fn();

vi.mock("../../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuests: vi.fn(),
  useCreateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateGuest: () => ({ mutateAsync: mockCreateGuest, isPending: false }),
  useUpdateGuest: () => ({ mutateAsync: mockUpdateGuest, isPending: false }),
  useDeleteGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useHouseholds, useGuests } from "../../../../hooks/useGuests";

const mockEvent: Event = {
  id: "evt-guest-modal-1",
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
  eventId: "evt-guest-modal-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "guests",
  refetch: vi.fn(),
};

const mockHouseholds: GuestHousehold[] = [
  {
    id: "hh-1",
    event: "evt-guest-modal-1",
    name: "The Anderson Family",
    address: "123 Elm St",
    email: "anderson@example.com",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "hh-2",
    event: "evt-guest-modal-1",
    name: "The Miller Household",
    address: "456 Oak St",
    email: "miller@example.com",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

const mockGuest: Guest = {
  id: "g-1",
  household: "hh-1",
  event: "evt-guest-modal-1",
  first_name: "Sarah",
  last_name: "Anderson",
  rsvp_status: "attending",
  dietary_restrictions: "Gluten-free, Vegetarian",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("GuestModal Component (Sub-Task 3.5.3b)", () => {
  it("does not render when isOpen is false", () => {
    render(
      <GuestModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        households={mockHouseholds}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders with 'Add New Guest' title and empty fields by default", () => {
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        households={mockHouseholds}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add New Guest")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/RSVP Status/i)).toHaveValue("pending");
    expect(screen.getByLabelText(/Dietary Restrictions/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Add Guest" })).toBeInTheDocument();
  });

  it("pre-selects the defaultHouseholdId if specified", () => {
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        households={mockHouseholds}
        defaultHouseholdId="hh-2"
      />
    );

    expect(screen.getByLabelText(/Household \/ Family Group/i)).toHaveValue("hh-2");
  });

  it("renders in edit mode and pre-populates fields with initialGuest data", () => {
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        households={mockHouseholds}
        initialGuest={mockGuest}
      />
    );

    expect(screen.getByText("Edit Guest")).toBeInTheDocument();
    expect(screen.getByLabelText(/Household \/ Family Group/i)).toHaveValue("hh-1");
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Sarah");
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("Anderson");
    expect(screen.getByLabelText(/RSVP Status/i)).toHaveValue("attending");
    expect(screen.getByLabelText(/Dietary Restrictions/i)).toHaveValue("Gluten-free, Vegetarian");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("shows validation error when first name or last name is missing", async () => {
    const mockSubmit = vi.fn();
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        households={mockHouseholds}
      />
    );

    // Try submitting empty
    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));

    expect(screen.getByRole("alert")).toHaveTextContent("First name is required.");
    expect(mockSubmit).not.toHaveBeenCalled();

    // Fill first name only
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "John" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Last name is required.");
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits valid guest data and calls onClose on success", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <GuestModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={mockSubmit}
        households={mockHouseholds}
      />
    );

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "  Michael  " } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "  Scott  " } });
    fireEvent.change(screen.getByLabelText(/RSVP Status/i), { target: { value: "attending" } });
    fireEvent.change(screen.getByLabelText(/Dietary Restrictions/i), {
      target: { value: "No dairy" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        household: "hh-1",
        first_name: "Michael",
        last_name: "Scott",
        rsvp_status: "attending",
        dietary_restrictions: "No dairy",
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error alert when submission throws an exception", async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error("Database connection failed"));
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        households={mockHouseholds}
      />
    );

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Jim" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Halpert" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Database connection failed");
    });
  });

  it("disables inputs and buttons when isSubmitting is true", () => {
    render(
      <GuestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        households={mockHouseholds}
        isSubmitting={true}
      />
    );

    expect(screen.getByLabelText(/First Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Last Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Household \/ Family Group/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
  });

  it("closes modal on Escape key press", () => {
    const mockClose = vi.fn();
    render(
      <GuestModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={vi.fn()}
        households={mockHouseholds}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});

describe("EventGuestsTab Guest Modal Integration (Sub-Task 3.5.3b)", () => {
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
            <EventGuestsTab />
          </EventContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("opens GuestModal pre-selected with household when clicking '+ Add Guest' on an expanded household", async () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockGuest],
      isLoading: false,
    });

    renderWithProviders();

    // Click "+ Add Guest" on household card header
    const addGuestBtn = screen.getByRole("button", { name: /Add guest to The Anderson Family/i });
    fireEvent.click(addGuestBtn);

    // Modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add New Guest")).toBeInTheDocument();
    expect(screen.getByLabelText(/Household \/ Family Group/i)).toHaveValue("hh-1");

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Emma" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Anderson" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));

    await waitFor(() => {
      expect(mockCreateGuest).toHaveBeenCalledWith({
        household: "hh-1",
        first_name: "Emma",
        last_name: "Anderson",
        rsvp_status: "pending",
        dietary_restrictions: "",
        event: "evt-guest-modal-1",
      });
    });
  });

  it("opens GuestModal in edit mode when clicking Edit on a guest row", async () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockHouseholds,
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockGuest],
      isLoading: false,
    });

    renderWithProviders();

    // Click edit on the guest row
    const editBtn = screen.getByRole("button", { name: /Edit Sarah Anderson/i });
    fireEvent.click(editBtn);

    // Modal opens with pre-filled guest details
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit Guest")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Sarah");
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue("Anderson");

    // Change dietary restrictions and save
    fireEvent.change(screen.getByLabelText(/Dietary Restrictions/i), {
      target: { value: "Vegan only" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateGuest).toHaveBeenCalledWith({
        id: "g-1",
        payload: {
          household: "hh-1",
          first_name: "Sarah",
          last_name: "Anderson",
          rsvp_status: "attending",
          dietary_restrictions: "Vegan only",
          event: "evt-guest-modal-1",
        },
      });
    });
  });
});
