import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatCurrency, calculateBudgetSummary } from "../budgetUtils";
import { BudgetSummaryCards } from "../BudgetSummaryCards";
import { EventBudgetTab } from "../../tabs/EventBudgetTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BudgetCategory, Event } from "../../../../api/types";

// Mock useBudgets hook
vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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

describe("Budget Utilities (Sub-Task 3.4.1)", () => {
  describe("formatCurrency", () => {
    it("formats valid numbers and decimal strings as USD currency", () => {
      expect(formatCurrency(5000)).toBe("$5,000.00");
      expect(formatCurrency("1250.5")).toBe("$1,250.50");
      expect(formatCurrency(0)).toBe("$0.00");
    });

    it("handles null, undefined, and non-numeric values safely", () => {
      expect(formatCurrency(null)).toBe("$0.00");
      expect(formatCurrency(undefined)).toBe("$0.00");
      expect(formatCurrency("")).toBe("$0.00");
      expect(formatCurrency("not-a-number")).toBe("$0.00");
    });
  });

  describe("calculateBudgetSummary", () => {
    it("returns zeroed summary when categories list is empty", () => {
      const summary = calculateBudgetSummary([]);
      expect(summary.totalAllocated).toBe(0);
      expect(summary.totalEstimated).toBe(0);
      expect(summary.totalActual).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.totalCategoriesCount).toBe(0);
      expect(summary.totalLineItemsCount).toBe(0);
    });

    it("aggregates totals across multiple categories and line items accurately", () => {
      const summary = calculateBudgetSummary(mockCategories);

      // Allocated: 5000 + 3000 = 8000
      expect(summary.totalAllocated).toBe(8000);
      // Estimated: 3000 + 1500 + 1000 = 5500
      expect(summary.totalEstimated).toBe(5500);
      // Actual: 2800 + 1200 + 1000 = 5000
      expect(summary.totalActual).toBe(5000);
      // Paid: item-1 ($2800) + item-3 ($1000) = 3800
      expect(summary.totalPaid).toBe(3800);
      // Pending: 5000 - 3800 = 1200
      expect(summary.totalPending).toBe(1200);
      // Variance: 5500 - 8000 = -2500 (under budget)
      expect(summary.estimatedVariance).toBe(-2500);
      expect(summary.isOverBudget).toBe(false);
      // Utilization: (5000 / 8000) * 100 = 62.5% -> 63%
      expect(summary.utilizationPercent).toBe(63);
      expect(summary.totalCategoriesCount).toBe(2);
      expect(summary.totalLineItemsCount).toBe(3);
      expect(summary.paidLineItemsCount).toBe(2);
    });

    it("flags isOverBudget as true when estimated cost exceeds allocated budget", () => {
      const overBudgetCategories: BudgetCategory[] = [
        {
          id: "cat-over",
          event: "evt-budget-1",
          name: "Decor",
          allocated_amount: "1000.00",
          created_at: "",
          updated_at: "",
          line_items: [
            {
              id: "item-over",
              category: "cat-over",
              event: "evt-budget-1",
              description: "Custom floral wall",
              estimated_cost: "1500.00",
              actual_cost: "0.00",
              is_paid: false,
              created_at: "",
              updated_at: "",
            },
          ],
        },
      ];

      const summary = calculateBudgetSummary(overBudgetCategories);
      expect(summary.isOverBudget).toBe(true);
      expect(summary.estimatedVariance).toBe(500);
    });
  });
});

describe("BudgetSummaryCards Component", () => {
  it("renders all 4 KPI cards and under-budget badge", () => {
    const summary = calculateBudgetSummary(mockCategories);
    render(<BudgetSummaryCards summary={summary} />);

    // Allocated card
    const allocatedCard = screen.getByTestId("kpi-allocated");
    expect(allocatedCard).toHaveTextContent("$8,000.00");
    expect(allocatedCard).toHaveTextContent("Across 2 categories");

    // Estimated card
    const estimatedCard = screen.getByTestId("kpi-estimated");
    expect(estimatedCard).toHaveTextContent("$5,500.00");
    expect(estimatedCard).toHaveTextContent("$2,500.00 under");

    // Actual card
    const actualCard = screen.getByTestId("kpi-actual");
    expect(actualCard).toHaveTextContent("$5,000.00");
    expect(actualCard).toHaveTextContent("63% of allocated");

    // Payments card
    const paymentsCard = screen.getByTestId("kpi-payments");
    expect(paymentsCard).toHaveTextContent("$3,800.00");
    expect(paymentsCard).toHaveTextContent("2/3 paid");
    expect(paymentsCard).toHaveTextContent("$1,200.00 pending");

    // No alert banner when under budget
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders over-budget alert banner when projected cost exceeds budget", () => {
    const overSummary = calculateBudgetSummary([
      {
        id: "cat-1",
        event: "evt-1",
        name: "Stage",
        allocated_amount: "2000.00",
        created_at: "",
        updated_at: "",
        line_items: [
          {
            id: "item-1",
            category: "cat-1",
            event: "evt-1",
            description: "Sound system",
            estimated_cost: "2800.00",
            actual_cost: "2800.00",
            is_paid: false,
            created_at: "",
            updated_at: "",
          },
        ],
      },
    ]);

    render(<BudgetSummaryCards summary={overSummary} />);

    // Alert banner
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Budget Exceeded/i);
    expect(alert).toHaveTextContent(/\$800\.00/);

    // Over budget badge
    expect(screen.getByText(/\+\$800\.00 over/i)).toBeInTheDocument();
  });
});

describe("EventBudgetTab Integration (Sub-Task 3.4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading pulse when categories are loading", () => {
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = renderBudgetTab();
    expect(container.querySelector(".placeholder-pulse")).toBeInTheDocument();
  });

  it("renders empty state when event has no budget categories", () => {
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderBudgetTab();
    expect(screen.getByText("No Budget Categories Yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Start organizing event expenses by allocating your total budget/i)
    ).toBeInTheDocument();
  });

  it("renders budget summary cards when categories are loaded", () => {
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });

    renderBudgetTab();
    expect(screen.getByTestId("kpi-allocated")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-estimated")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-actual")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-payments")).toBeInTheDocument();
  });
});
