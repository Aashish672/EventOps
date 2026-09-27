import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventBudgetTab } from "../../tabs/EventBudgetTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BudgetCategory, Event } from "../../../../api/types";

// Mock hooks
const mockUpdateLineItem = vi.fn();

vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({
    mutateAsync: mockUpdateLineItem,
    isPending: false,
  }),
  useCreateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBudgetCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useBudgetCategories } from "../../../../hooks/useBudgets";

const mockEvent: Event = {
  id: "evt-budget-1",
  organization: "org-1",
  name: "Gala Dinner 2026",
  description: "Annual gala event",
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
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    line_items: [
      {
        id: "item-1",
        category: "cat-1",
        event: "evt-budget-1",
        description: "Dinner buffet deposit",
        estimated_cost: "3000.00",
        actual_cost: "2800.00",
        is_paid: true,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "item-2",
        category: "cat-1",
        event: "evt-budget-1",
        description: "Bar service",
        estimated_cost: "1500.00",
        actual_cost: "1200.00",
        is_paid: false,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
    ],
  },
  {
    id: "cat-2",
    event: "evt-budget-1",
    name: "Venue & Production",
    allocated_amount: "3000.00",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    line_items: [
      {
        id: "item-3",
        category: "cat-2",
        event: "evt-budget-1",
        description: "Stage lighting",
        estimated_cost: "1000.00",
        actual_cost: "1000.00",
        is_paid: true,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
    ],
  },
];

function renderBudgetTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EventContext.Provider value={mockEventContext}>
        <MemoryRouter>
          <EventBudgetTab />
        </MemoryRouter>
      </EventContext.Provider>
    </QueryClientProvider>
  );
}

describe("Nested Budget Category & Line Items Table (Sub-Task 3.4.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
  });

  it("renders category accordion cards with line items visible by default", () => {
    renderBudgetTab();

    // Check category names
    expect(screen.getByText("Catering & Drinks")).toBeInTheDocument();
    expect(screen.getByText("Venue & Production")).toBeInTheDocument();

    // Check nested line items are in document
    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
    expect(screen.getByText("Bar service")).toBeInTheDocument();
    expect(screen.getByText("Stage lighting")).toBeInTheDocument();

    // Check payment badges
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });

  it("toggles expand and collapse of category accordion", () => {
    renderBudgetTab();

    // Click toggle button for "Catering & Drinks"
    const toggleBtn = screen.getByRole("button", { name: /Toggle Catering & Drinks category line items/i });
    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Dinner buffet deposit")).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
  });

  it("collapses and expands all categories with Collapse All button", () => {
    renderBudgetTab();

    const toggleAllBtn = screen.getByRole("button", { name: /Collapse all categories/i });
    fireEvent.click(toggleAllBtn);

    // Now all line items should be hidden
    expect(screen.queryByText("Dinner buffet deposit")).not.toBeInTheDocument();
    expect(screen.queryByText("Stage lighting")).not.toBeInTheDocument();

    // Click Expand All
    const expandAllBtn = screen.getByRole("button", { name: /Expand all categories/i });
    fireEvent.click(expandAllBtn);

    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
    expect(screen.getByText("Stage lighting")).toBeInTheDocument();
  });

  it("triggers line item payment status toggle mutation", async () => {
    mockUpdateLineItem.mockResolvedValueOnce({ id: "item-2", is_paid: true });
    renderBudgetTab();

    // "Bar service" is currently unpaid
    const payBtn = screen.getByRole("button", { name: /Mark Bar service as paid/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(mockUpdateLineItem).toHaveBeenCalledWith({
        id: "item-2",
        payload: { is_paid: true },
      });
    });
  });

  it("filters line items and categories by search query", () => {
    renderBudgetTab();

    const searchInput = screen.getByRole("textbox", { name: /Search categories or items/i });
    fireEvent.change(searchInput, { target: { value: "lighting" } });

    // "Stage lighting" matches under "Venue & Production"
    expect(screen.getByText("Stage lighting")).toBeInTheDocument();
    expect(screen.getByText("Venue & Production")).toBeInTheDocument();

    // "Catering & Drinks" does not match
    expect(screen.queryByText("Dinner buffet deposit")).not.toBeInTheDocument();
    expect(screen.queryByText("Catering & Drinks")).not.toBeInTheDocument();
  });

  it("filters line items by payment status dropdown", () => {
    renderBudgetTab();

    const filterSelect = screen.getByRole("combobox", { name: /Filter expenses by payment status/i });

    // Filter to Unpaid only
    fireEvent.change(filterSelect, { target: { value: "unpaid" } });

    expect(screen.getByText("Bar service")).toBeInTheDocument();
    expect(screen.queryByText("Dinner buffet deposit")).not.toBeInTheDocument();
    expect(screen.queryByText("Stage lighting")).not.toBeInTheDocument();

    // Filter to Paid only
    fireEvent.change(filterSelect, { target: { value: "paid" } });

    expect(screen.queryByText("Bar service")).not.toBeInTheDocument();
    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
    expect(screen.getByText("Stage lighting")).toBeInTheDocument();
  });

  it("displays empty search results state and resets with clear filters", () => {
    renderBudgetTab();

    const searchInput = screen.getByRole("textbox", { name: /Search categories or items/i });
    fireEvent.change(searchInput, { target: { value: "nonexistentKeyword123" } });

    expect(screen.getByText("No Matching Expenses")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText("Dinner buffet deposit")).toBeInTheDocument();
  });
});
