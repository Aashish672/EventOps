import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GeneratePlanModal } from "../GeneratePlanModal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgentRun } from "../../../../api/types";

// Mock the useGenerateEventPlan hook
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock("../../../../hooks/useAgents", () => ({
  useGenerateEventPlan: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockPlanResult: AgentRun = {
  id: "run-plan-123",
  organization: "org-1",
  event: "evt-123",
  agent_type: "event_planning",
  trigger: "AI Roadmap Synthesis: Corporate Conference (standard)",
  input_snapshot: {},
  reasoning: "Synthesized 5 milestones and 14 tasks.",
  proposed_diff: {
    mutations: [],
    plan_summary: "120-day reverse-scheduled operational roadmap.",
  },
  final_diff: null,
  state: "pending",
  reviewed_by: null,
  reviewed_by_email: null,
  reviewed_at: null,
  created_at: "2026-10-30T12:00:00Z",
  updated_at: "2026-10-30T12:00:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("GeneratePlanModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("does not render when isOpen is false", () => {
    renderWithClient(
      <GeneratePlanModal
        isOpen={false}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal header, description, category selector, scale selector, and notes textarea", () => {
    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AI Event Planning Agent")).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Category \/ Format/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Attendee Scale & Scope/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Specific Focus Areas or Organizer Notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate AI Roadmap/i })).toBeInTheDocument();
  });

  it("clicking a preset category chip updates the selected category", () => {
    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const galaChip = screen.getByRole("button", { name: "Gala & Fundraiser" });
    fireEvent.click(galaChip);

    const select = screen.getByLabelText(/Event Category \/ Format/i) as HTMLSelectElement;
    expect(select.value).toBe("Gala & Fundraiser");
  });

  it("submitting the form calls mutateAsync with selected options and calls onSuccess & onClose", async () => {
    mockMutateAsync.mockResolvedValueOnce(mockPlanResult);

    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    // Enter custom notes
    const notesInput = screen.getByLabelText(/Specific Focus Areas or Organizer Notes/i);
    fireEvent.change(notesInput, { target: { value: "Prioritize AV and city permits" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Generate AI Roadmap/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        category: "Corporate Conference",
        scale: "standard",
        notes: "Prioritize AV and city permits",
        trigger_reason: "AI Roadmap Synthesis: Corporate Conference (standard)",
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockPlanResult);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("renders error banner when mutation fails", async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error("LLM Rate Limit exceeded"));

    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Generate AI Roadmap/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("LLM Rate Limit exceeded")).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("disables inputs and buttons when isPending is true", () => {
    mockIsPending = true;

    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Synthesizing Roadmap...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Synthesizing Roadmap/i })).toBeDisabled();
    expect(screen.getByLabelText(/Event Category \/ Format/i)).toBeDisabled();
    expect(screen.getByLabelText(/Attendee Scale & Scope/i)).toBeDisabled();
  });

  it("pressing Escape key closes the modal", () => {
    renderWithClient(
      <GeneratePlanModal
        isOpen={true}
        onClose={mockOnClose}
        eventId="evt-123"
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
