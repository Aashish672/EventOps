import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnalyzeBudgetModal } from "../AnalyzeBudgetModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentRun } from "../../../../api/types";

// Mock the useAnalyzeEventBudget hook
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../../../../hooks/useAgents", () => ({
  useAnalyzeEventBudget: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockRunResult: AgentRun = {
  id: "run-budget-test-123",
  organization: "org-1",
  event: "evt-123",
  agent_type: "budget_intelligence",
  trigger: "Variance & Overspend Audit",
  input_snapshot: {},
  reasoning: "Catering costs exceed original estimate by 20%.",
  proposed_diff: {
    mutations: [],
  },
  final_diff: null,
  state: "pending",
  reviewed_by: null,
  reviewed_by_email: null,
  reviewed_at: null,
  created_at: "2026-11-12T12:00:00Z",
  updated_at: "2026-11-12T12:00:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AnalyzeBudgetModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("does not render when isOpen is false", () => {
    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={false}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal header, description, textarea, and quick preset scenarios", () => {
    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AI Budget Intelligence Agent")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Describe specific cost concerns/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Variance & Overspend Audit")).toBeInTheDocument();
    expect(screen.getByText("Full Budget Health Check")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Budget Analysis/i })).toBeInTheDocument();
  });

  it("clicking a preset chip populates the reason textarea", () => {
    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Describe specific cost concerns/i);
    expect(textarea).toHaveValue("");

    const chip = screen.getByRole("button", { name: "Variance & Overspend Audit" });
    fireEvent.click(chip);

    expect(textarea).toHaveValue(
      "Audit actual vs estimated expenses across all line items and flag items exceeding 10% variance."
    );
  });

  it("submits the budget analysis and triggers onSuccess and onClose", async () => {
    mockMutateAsync.mockResolvedValueOnce(mockRunResult);

    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Describe specific cost concerns/i);
    fireEvent.change(textarea, { target: { value: "Review audio visual overages" } });

    const submitBtn = screen.getByRole("button", { name: /Run Budget Analysis/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("Review audio visual overages");
      expect(mockOnSuccess).toHaveBeenCalledWith(mockRunResult);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error banner when the mutation rejects", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Failed to connect to LLM provider"));

    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Run Budget Analysis/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Failed to connect to LLM provider")).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it("calls onClose when Cancel button or Close X button is clicked", () => {
    renderWithClient(
      <AnalyzeBudgetModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const closeXBtn = screen.getByRole("button", { name: "Close modal" });
    fireEvent.click(closeXBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});

