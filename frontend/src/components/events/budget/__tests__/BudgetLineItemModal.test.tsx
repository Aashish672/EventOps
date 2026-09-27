import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetLineItemModal } from "../BudgetLineItemModal";
import { EventBudgetTab } from "../../tabs/EventBudgetTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BudgetCategory, BudgetLineItem, Event } from "../../../../api/types";

// Mock hooks
const mockCreateLineItem = vi.fn();
const mockUpdateLineItem = vi.fn();

vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({ mutateAsync: mockUpdateLineItem, isPending: false }),
  useCreateBudgetLineItem: () => ({ mutateAsync: mockCreateLineItem, isPending: false }),
  useCreateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const mockCategories: BudgetCategory[] = [
  {
    id: "cat-1",
    event: "evt-budget-1",
    name: "Catering & Drinks",
    allocated_amount: "5000.00",
    created_at: "",
    updated_at: "",
    line_items: [],
  },
  {
    id: "cat-2",
    event: "evt-budget-1",
    name: "Venue",
    allocated_amount: "3000.00",
    created_at: "",
    updated_at: "",
    line_items: [],
  },
];

describe("BudgetLineItemModal Component (Sub-Task 3.4.3b)", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BudgetLineItemModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders in create mode with category selector and empty inputs", () => {
    render(
      <BudgetLineItemModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />
    );

    expect(screen.getByRole("heading", { name: "Add Budget Line Item" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toHaveValue("cat-1");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("");
    expect(screen.getByLabelText(/Estimated Cost/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Actual Cost/i)).toHaveValue(null);
    expect(screen.getByRole("checkbox", { name: /Mark this item as paid/i })).not.toBeChecked();
  });

  it("pre-selects defaultCategoryId when provided", () => {
    render(
      <BudgetLineItemModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
        defaultCategoryId="cat-2"
      />
    );

    expect(screen.getByLabelText(/Category/i)).toHaveValue("cat-2");
  });

  it("renders in edit mode with prefilled values", () => {
    const item: BudgetLineItem = {
      id: "item-1",
      category: "cat-2",
      event: "evt-budget-1",
      description: "Security deposit",
      estimated_cost: "1000.00",
      actual_cost: "1000.00",
      is_paid: true,
      created_at: "",
      updated_at: "",
    };

    render(
      <BudgetLineItemModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
        initialItem={item}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Budget Item" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toHaveValue("cat-2");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Security deposit");
    expect(screen.getByLabelText(/Estimated Cost/i)).toHaveValue(1000);
    expect(screen.getByRole("checkbox", { name: /Mark this item as paid/i })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("validates required description", () => {
    render(
      <BudgetLineItemModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Line Item" }));

    expect(screen.getByText("Item description is required.")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits valid line item data", async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <BudgetLineItemModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
        defaultCategoryId="cat-1"
      />
    );

    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Champagne Toast" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Cost/i), {
      target: { value: "850" },
    });
    fireEvent.change(screen.getByLabelText(/Actual Cost/i), {
      target: { value: "820" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Mark this item as paid/i }));

    fireEvent.click(screen.getByRole("button", { name: "Add Line Item" }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        category: "cat-1",
        description: "Champagne Toast",
        estimated_cost: "850.00",
        actual_cost: "820.00",
        is_paid: true,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe("EventBudgetTab Line Item Modal Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
  });

  it("opens line item modal from category Add Item button and submits", async () => {
    mockCreateLineItem.mockResolvedValueOnce({ id: "item-new" });

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

    // Click "Add Item" button for first category
    const addBtn = screen.getByRole("button", { name: "Add item to Catering & Drinks" });
    fireEvent.click(addBtn);

    // Line item modal opens
    expect(screen.getByRole("heading", { name: "Add Budget Line Item" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Category/i })).toHaveValue("cat-1");

    // Fill form
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Cocktail Napkins" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Cost/i), {
      target: { value: "120" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Line Item" }));

    await waitFor(() => {
      expect(mockCreateLineItem).toHaveBeenCalledWith({
        event: "evt-budget-1",
        category: "cat-1",
        description: "Cocktail Napkins",
        estimated_cost: "120.00",
        actual_cost: "0.00",
        is_paid: false,
      });
    });
  });
});
