import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteGuestModal, DeleteGuestTarget } from "../DeleteGuestModal";
import { EventGuestsTab } from "../../tabs/EventGuestsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { GuestHousehold, Guest, Event } from "../../../../api/types";

// Mock mutations
const mockDeleteHousehold = vi.fn();
const mockDeleteGuest = vi.fn();

vi.mock("../../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuests: vi.fn(),
  useCreateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHousehold: () => ({ mutateAsync: mockDeleteHousehold, isPending: false }),
  useCreateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGuest: () => ({ mutateAsync: mockDeleteGuest, isPending: false }),
}));

import { useHouseholds, useGuests } from "../../../../hooks/useGuests";

const mockEvent: Event = {
  id: "evt-del-guest-1",
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
  eventId: "evt-del-guest-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "guests",
  refetch: vi.fn(),
};

const mockHousehold: GuestHousehold = {
  id: "hh-del-1",
  event: "evt-del-guest-1",
  name: "The Anderson Family",
  address: "123 Elm St",
  email: "anderson@example.com",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockGuest: Guest = {
  id: "g-del-1",
  household: "hh-del-1",
  event: "evt-del-guest-1",
  first_name: "Sarah",
  last_name: "Anderson",
  rsvp_status: "attending",
  dietary_restrictions: "Vegetarian",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("DeleteGuestModal Component (Sub-Task 3.5.3c)", () => {
  it("does not render when isOpen is false or target is null", () => {
    const { rerender } = render(
      <DeleteGuestModal
        isOpen={false}
        target={{ type: "household", household: mockHousehold, memberGuestCount: 2 }}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <DeleteGuestModal
        isOpen={true}
        target={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders household delete confirmation with cascade warning and member count", () => {
    const target: DeleteGuestTarget = {
      type: "household",
      household: mockHousehold,
      memberGuestCount: 3,
    };

    render(
      <DeleteGuestModal
        isOpen={true}
        target={target}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete Guest Household")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "The Anderson Family"\?/i)).toBeInTheDocument();
    expect(screen.getByText(/3 member guests/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This household and all of its 3 associated member guests will be permanently removed\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Household" })).toBeInTheDocument();
  });

  it("renders individual guest delete confirmation", () => {
    const target: DeleteGuestTarget = {
      type: "guest",
      guest: mockGuest,
    };

    render(
      <DeleteGuestModal
        isOpen={true}
        target={target}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Remove Guest" })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove "Sarah Anderson"\?/i)).toBeInTheDocument();
    expect(screen.getByText(/RSVP: ATTENDING/i)).toBeInTheDocument();
    expect(screen.getByText(/Dietary: Vegetarian/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This guest will be permanently removed from the event\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Guest" })).toBeInTheDocument();
  });

  it("calls onConfirm and onClose when clicking delete button", async () => {
    const mockConfirm = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <DeleteGuestModal
        isOpen={true}
        target={{ type: "household", household: mockHousehold, memberGuestCount: 1 }}
        onClose={mockClose}
        onConfirm={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Household" }));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith({
        type: "household",
        id: "hh-del-1",
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("shows error alert when onConfirm throws an error", async () => {
    const mockConfirm = vi.fn().mockRejectedValue(new Error("Network deletion error"));
    render(
      <DeleteGuestModal
        isOpen={true}
        target={{ type: "guest", guest: mockGuest }}
        onClose={vi.fn()}
        onConfirm={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Guest" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network deletion error");
    });
  });

  it("closes modal on Escape key press and Cancel button", () => {
    const mockClose = vi.fn();
    const { rerender } = render(
      <DeleteGuestModal
        isOpen={true}
        target={{ type: "guest", guest: mockGuest }}
        onClose={mockClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(2);

    // Should not close on Escape if isDeleting is true
    rerender(
      <DeleteGuestModal
        isOpen={true}
        target={{ type: "guest", guest: mockGuest }}
        onClose={mockClose}
        onConfirm={vi.fn()}
        isDeleting={true}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});

describe("EventGuestsTab Delete Integration (Sub-Task 3.5.3c)", () => {
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

  it("opens delete modal from household menu and deletes household", async () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockHousehold],
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockGuest],
      isLoading: false,
    });

    renderWithProviders();

    // Open household menu
    const menuBtn = screen.getByRole("button", { name: /Options for The Anderson Family/i });
    fireEvent.click(menuBtn);

    // Click delete household in menu
    const deleteMenuBtn = screen.getByRole("menuitem", { name: /Delete Household/i });
    fireEvent.click(deleteMenuBtn);

    // Delete modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete Guest Household" })).toBeInTheDocument();
    expect(screen.getByText(/1 member guest/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: "Delete Household" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteHousehold).toHaveBeenCalledWith("hh-del-1");
    });
  });

  it("opens delete modal from guest row and removes guest", async () => {
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockHousehold],
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockGuest],
      isLoading: false,
    });

    renderWithProviders();

    // Click delete on guest row
    const deleteBtn = screen.getByRole("button", { name: /Delete Sarah Anderson/i });
    fireEvent.click(deleteBtn);

    // Modal opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Remove Guest" })).toBeInTheDocument();

    // Confirm remove
    const confirmBtn = screen.getByRole("button", { name: "Remove Guest" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteGuest).toHaveBeenCalledWith("g-del-1");
    });
  });
});
