import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteBudgetModal } from "../DeleteBudgetModal";
import { EventBudgetTab } from "../../tabs/EventBudgetTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BudgetCategory, BudgetLineItem, Event } from "../../../../api/types";

// Mock hooks
const mockDeleteCategory = vi.fn();
const mockDeleteLineItem = vi.fn();

vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBudgetLineItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteBudgetLineItem: () => ({ mutateAsync: mockDeleteLineItem, isPending: false }),
  useCreateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteBudgetCategory: () => ({ mutateAsync: mockDeleteCategory, isPending: false }),
}));

import { useBudgetCategories } from "../../../../hooks/useBudgets";

const mockEvent: Event = {
  id: "evt-budget-1",
  organization: "org-1",
  name: "Gala Dinner 2026",
  description: "Annual gala",
  start_date: "2026-12-01T18:00:00Z",
  end_date: "2026-12-01T23:00:00Z",
  status: "planning",
  assigned_planner: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const mockEventContext: EventContextType = {
  eventId: "evt-budget-1",
  event: mockEvent,
  isLoading: false,
  error: null,
  activeTab: "budget",
  refetch: vi.fn(),
};

const sampleCategory: BudgetCategory = {
  id: "cat-1",
  event: "evt-budget-1",
  name: "Catering & Drinks",
  allocated_amount: "5000.00",
  created_at: "",
  updated_at: "",
  line_items: [
    {
      id: "item-1",
      category: "cat-1",
      event: "evt-budget-1",
      description: "Dinner buffet deposit",
      estimated_cost: "3000.00",
      actual_cost: "2800.00",
      is_paid: true,
      created_at: "",
      updated_at: "",
    },
  ],
};

const sampleItem: BudgetLineItem = {
  id: "item-1",
  category: "cat-1",
  event: "evt-budget-1",
  description: "Dinner buffet deposit",
  estimated_cost: "3000.00",
  actual_cost: "2800.00",
  is_paid: true,
  created_at: "",
  updated_at: "",
};

describe("DeleteBudgetModal Component (Sub-Task 3.4.3c)", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteBudgetModal
        isOpen={false}
        target={{ type: "category", category: sampleCategory }}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders category deletion modal with cascade warning", () => {
    render(
      <DeleteBudgetModal
        isOpen={true}
        target={{ type: "category", category: sampleCategory }}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole("heading", { name: "Delete Budget Category" })).toBeInTheDocument();
    expect(screen.getByText("Catering & Drinks")).toBeInTheDocument();
    expect(
      screen.getByText(/This category and all of its associated line items will be permanently deleted/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Category" })).toBeInTheDocument();
  });

  it("renders line item deletion modal with item preview", () => {
    render(
      <DeleteBudgetModal
        isOpen={true}
        target={{ type: "item", item: sampleItem }}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole("heading", { name: "Delete Budget Line Item" })).toBeInTheDocument();
    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
    expect(
      screen.getByText(/This line item expense will be permanently deleted from the budget/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Item" })).toBeInTheDocument();
  });

  it("submits category deletion on confirm click", async () => {
    mockOnConfirm.mockResolvedValueOnce(undefined);

    render(
      <DeleteBudgetModal
        isOpen={true}
        target={{ type: "category", category: sampleCategory }}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Category" }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        type: "category",
        id: "cat-1",
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("submits line item deletion on confirm click", async () => {
    mockOnConfirm.mockResolvedValueOnce(undefined);

    render(
      <DeleteBudgetModal
        isOpen={true}
        target={{ type: "item", item: sampleItem }}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Item" }));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        type: "item",
        id: "item-1",
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe("EventBudgetTab Delete Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [sampleCategory],
      isLoading: false,
    });
  });

  it("opens delete modal from category options and confirms deletion", async () => {
    mockDeleteCategory.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <EventContext.Provider value={mockEventContext}>
          <MemoryRouter>
            <EventBudgetTab />
          </MemoryRouter>
        </EventContext.Provider>
      </QueryClientProvider>
    );

    // Open category options menu
    const menuBtn = screen.getByRole("button", { name: "Options for Catering & Drinks" });
    fireEvent.click(menuBtn);

    // Click "Delete Category" option
    const deleteOption = screen.getByRole("button", { name: "Delete Category" });
    fireEvent.click(deleteOption);

    // Modal opens
    expect(screen.getByRole("heading", { name: "Delete Budget Category" })).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: "Delete Category" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith("cat-1");
    });
  });
});
