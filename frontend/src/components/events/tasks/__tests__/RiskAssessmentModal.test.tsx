import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RiskAssessmentModal } from "../RiskAssessmentModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentRun } from "../../../../api/types";

// Mock the useAnalyzeEventRisk hook
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../../../../hooks/useAgents", () => ({
  useAnalyzeEventRisk: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockRunResult: AgentRun = {
  id: "run-test-123",
  organization: "org-1",
  event: "evt-123",
  agent_type: "risk_change_impact",
  trigger: "AV Vendor Delay",
  input_snapshot: {},
  reasoning: "Equipment delayed 3 hours.",
  proposed_diff: {
    mutations: [],
    risk_severity: "high",
    impact_summary: "Stage setup shifted by 3 hours.",
  },
  final_diff: null,
  state: "pending",
  reviewed_by: null,
  reviewed_by_email: null,
  reviewed_at: null,
  created_at: "2026-10-26T12:00:00Z",
  updated_at: "2026-10-26T12:00:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("RiskAssessmentModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("does not render when isOpen is false", () => {
    renderWithClient(
      <RiskAssessmentModal
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
      <RiskAssessmentModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AI Risk & Change Impact Agent")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe any operational incident/i)).toBeInTheDocument();
    expect(screen.getByText("AV Vendor Delay")).toBeInTheDocument();
    expect(screen.getByText("Severe Weather Warning")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Risk Assessment/i })).toBeInTheDocument();
  });

  it("clicking a preset chip populates the reason textarea", () => {
    renderWithClient(
      <RiskAssessmentModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Describe any operational incident/i);
    expect(textarea).toHaveValue("");

    const avChip = screen.getByRole("button", { name: "AV Vendor Delay" });
    fireEvent.click(avChip);

    expect(textarea).toHaveValue(
      "Equipment transport truck delayed 3 hours on highway. Stage rigging and audio setup cannot begin until load-in completes."
    );
  });

  it("submits the risk assessment with input text and triggers onSuccess and onClose", async () => {
    mockMutateAsync.mockResolvedValueOnce(mockRunResult);

    renderWithClient(
      <RiskAssessmentModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/Describe any operational incident/i);
    fireEvent.change(textarea, { target: { value: "Keynote speaker flight cancelled" } });

    const submitBtn = screen.getByRole("button", { name: /Run Risk Assessment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith("Keynote speaker flight cancelled");
      expect(mockOnSuccess).toHaveBeenCalledWith(mockRunResult);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error banner when the mutation rejects", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("Rate limit exceeded for Gemini API"));

    renderWithClient(
      <RiskAssessmentModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Run Risk Assessment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Rate limit exceeded for Gemini API")).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it("calls onClose when Cancel button or Close X button is clicked", () => {
    renderWithClient(
      <RiskAssessmentModal
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
