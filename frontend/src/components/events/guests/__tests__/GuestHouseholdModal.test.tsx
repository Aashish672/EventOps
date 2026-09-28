import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestHouseholdModal } from "../GuestHouseholdModal";
import { EventGuestsTab } from "../../tabs/EventGuestsTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { GuestHousehold, Event } from "../../../../api/types";

// Mock mutations
const mockCreateHousehold = vi.fn();
const mockUpdateHousehold = vi.fn();

vi.mock("../../../../hooks/useGuests", () => ({
  useHouseholds: vi.fn(),
  useGuests: vi.fn(),
  useCreateHousehold: () => ({ mutateAsync: mockCreateHousehold, isPending: false }),
  useUpdateHousehold: () => ({ mutateAsync: mockUpdateHousehold, isPending: false }),
  useDeleteHousehold: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGuest: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useHouseholds, useGuests } from "../../../../hooks/useGuests";

const mockEvent: Event = {
  id: "evt-household-modal-1",
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
  eventId: "evt-household-modal-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "guests",
  refetch: vi.fn(),
};

const mockHousehold: GuestHousehold = {
  id: "hh-1",
  event: "evt-household-modal-1",
  name: "The Anderson Family",
  address: "123 Elm St, Apt 4B",
  email: "anderson@example.com",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("GuestHouseholdModal Component (Sub-Task 3.5.3a)", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <GuestHouseholdModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders in create mode with empty fields and default labels", () => {
    render(
      <GuestHouseholdModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(screen.getByRole("heading", { name: "Add Guest Household" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Household \/ Group Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/Primary Contact Email/i)).toHaveValue("");
    expect(screen.getByLabelText(/Mailing \/ Physical Address/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create Household" })).toBeInTheDocument();
  });

  it("renders in edit mode with prefilled fields from initialHousehold", () => {
    render(
      <GuestHouseholdModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialHousehold={mockHousehold}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Guest Household" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Household \/ Group Name/i)).toHaveValue("The Anderson Family");
    expect(screen.getByLabelText(/Primary Contact Email/i)).toHaveValue("anderson@example.com");
    expect(screen.getByLabelText(/Mailing \/ Physical Address/i)).toHaveValue("123 Elm St, Apt 4B");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("validates required name field on submission", async () => {
    const handleSubmit = vi.fn();
    render(
      <GuestHouseholdModal isOpen={true} onClose={vi.fn()} onSubmit={handleSubmit} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Household" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Household name is required.");
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("submits valid household data and closes modal", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <GuestHouseholdModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />
    );

    fireEvent.change(screen.getByLabelText(/Household \/ Group Name/i), {
      target: { value: "The Sterling Group" },
    });
    fireEvent.change(screen.getByLabelText(/Primary Contact Email/i), {
      target: { value: "sterling@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Mailing \/ Physical Address/i), {
      target: { value: "789 Park Ave" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Household" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: "The Sterling Group",
        email: "sterling@example.com",
        address: "789 Park Ave",
      });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("closes modal on Escape key press", () => {
    const handleClose = vi.fn();
    render(
      <GuestHouseholdModal isOpen={true} onClose={handleClose} onSubmit={vi.fn()} />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("EventGuestsTab Household Modal Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    (useHouseholds as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockHousehold],
      isLoading: false,
    });
    (useGuests as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
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

  it("opens modal from header Add Household button and submits create mutation", async () => {
    mockCreateHousehold.mockResolvedValueOnce({});
    renderTab();

    // Click header Add Household button
    const addBtn = screen.getByRole("button", { name: /Add Household/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole("heading", { name: "Add Guest Household" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Household \/ Group Name/i), {
      target: { value: "The Miller Household" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Household" }));

    await waitFor(() => {
      expect(mockCreateHousehold).toHaveBeenCalledWith({
        name: "The Miller Household",
        email: "",
        address: "",
        event: "evt-household-modal-1",
      });
    });
  });

  it("opens modal in edit mode from household menu and submits update mutation", async () => {
    mockUpdateHousehold.mockResolvedValueOnce({});
    renderTab();

    // Open options menu for household
    const menuBtn = screen.getByLabelText("Options for The Anderson Family");
    fireEvent.click(menuBtn);

    // Click Edit Household
    const editItem = screen.getByRole("menuitem", { name: /Edit Household/i });
    fireEvent.click(editItem);

    expect(screen.getByRole("heading", { name: "Edit Guest Household" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Household \/ Group Name/i)).toHaveValue("The Anderson Family");

    // Change email
    fireEvent.change(screen.getByLabelText(/Primary Contact Email/i), {
      target: { value: "new.anderson@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockUpdateHousehold).toHaveBeenCalledWith({
        id: "hh-1",
        payload: {
          name: "The Anderson Family",
          email: "new.anderson@example.com",
          address: "123 Elm St, Apt 4B",
          event: "evt-household-modal-1",
        },
      });
    });
  });
});
