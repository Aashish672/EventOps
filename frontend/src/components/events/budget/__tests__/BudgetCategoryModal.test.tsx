import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BudgetCategoryModal } from "../BudgetCategoryModal";
import { EventBudgetTab } from "../../tabs/EventBudgetTab";
import { EventContext, EventContextType } from "../../../../context/EventContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { BudgetCategory, Event } from "../../../../api/types";

// Mock hooks
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();

vi.mock("../../../../hooks/useBudgets", () => ({
  useBudgetCategories: vi.fn(),
  useUpdateBudgetLineItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateBudgetCategory: () => ({ mutateAsync: mockCreateCategory, isPending: false }),
  useUpdateBudgetCategory: () => ({ mutateAsync: mockUpdateCategory, isPending: false }),
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

describe("BudgetCategoryModal Component (Sub-Task 3.4.3a)", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BudgetCategoryModal isOpen={false} onClose={mockOnClose} onSubmit={mockOnSubmit} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders in create mode with empty fields", () => {
    render(<BudgetCategoryModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    expect(screen.getByRole("heading", { name: "Add Budget Category" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category Name/i)).toHaveValue("");
    expect(screen.getByLabelText(/Allocated Budget/i)).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Create Category" })).toBeInTheDocument();
  });

  it("renders in edit mode with prefilled values", () => {
    const category: BudgetCategory = {
      id: "cat-1",
      event: "evt-budget-1",
      name: "Audio & Visual",
      allocated_amount: "2500.00",
      line_items: [],
      created_at: "",
      updated_at: "",
    };

    render(
      <BudgetCategoryModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        initialCategory={category}
      />
    );

    expect(screen.getByRole("heading", { name: "Edit Budget Category" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category Name/i)).toHaveValue("Audio & Visual");
    expect(screen.getByLabelText(/Allocated Budget/i)).toHaveValue(2500);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("validates required name field before submitting", async () => {
    render(<BudgetCategoryModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Category" }));

    expect(screen.getByText("Category name is required.")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits valid category data with 2 decimal places", async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(<BudgetCategoryModal isOpen={true} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/Category Name/i), {
      target: { value: "Decor & Flowers" },
    });
    fireEvent.change(screen.getByLabelText(/Allocated Budget/i), {
      target: { value: "1500" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Decor & Flowers",
        allocated_amount: "1500.00",
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe("EventBudgetTab Category Modal Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBudgetCategories as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("opens create modal from empty state and submits new category", async () => {
    mockCreateCategory.mockResolvedValueOnce({ id: "cat-new" });

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

    // Click "Add First Category" button in empty state
    fireEvent.click(screen.getByRole("button", { name: "Add First Category" }));

    // Modal opens
    expect(screen.getByRole("heading", { name: "Add Budget Category" })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/Category Name/i), {
      target: { value: "Catering" },
    });
    fireEvent.change(screen.getByLabelText(/Allocated Budget/i), {
      target: { value: "4000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith({
        event: "evt-budget-1",
        name: "Catering",
        allocated_amount: "4000.00",
      });
    });
  });
});
