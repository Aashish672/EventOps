import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgentProposalCard } from "../AgentProposalCard";
import { AgentRun } from "../../../../api/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the API calls
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockEditApprove = vi.fn();

vi.mock("../../../../hooks/useAgents", () => ({
  useApproveAgentRun: () => ({
    mutateAsync: mockApprove,
    isPending: false,
    isError: false,
    error: null,
  }),
  useRejectAgentRun: () => ({
    mutateAsync: mockReject,
    isPending: false,
    isError: false,
    error: null,
  }),
  useEditApproveAgentRun: () => ({
    mutateAsync: mockEditApprove,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const mockProposal: AgentRun = {
  id: "run-uuid-1",
  organization: "org-1",
  event: "evt-100",
  agent_type: "risk_change_impact",
  trigger: "Vendor delay reported on Catering contract",
  input_snapshot: {},
  reasoning: "Task 14 must be rescheduled by 2 days due to delayed delivery.",
  proposed_diff: {
    mutations: [
      {
        action: "update",
        entity_type: "Task",
        entity_id: "task-100",
        fields: { status: "in_progress" },
      },
    ],
  },
  final_diff: null,
  state: "pending",
  reviewed_by: null,
  reviewed_by_email: null,
  reviewed_at: null,
  created_at: "2026-10-15T10:00:00Z",
  updated_at: "2026-10-15T10:00:00Z",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AgentProposalCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders agent persona badge, trigger text, and reasoning trace", () => {
    renderWithClient(
      <AgentProposalCard proposal={mockProposal} eventId="evt-100" canModerate={true} />
    );

    expect(screen.getByText("Risk & Change Impact Agent")).toBeInTheDocument();
    expect(screen.getByText(/Vendor delay reported on Catering contract/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 14 must be rescheduled by 2 days/i)).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("renders Approve, Edit Diff, and Reject buttons for pending proposals", () => {
    renderWithClient(
      <AgentProposalCard proposal={mockProposal} eventId="evt-100" canModerate={true} />
    );

    expect(screen.getByRole("button", { name: /Approve Proposal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Diff/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
  });

  it("calls approve mutation when clicking Approve Proposal button", async () => {
    mockApprove.mockResolvedValueOnce({ ...mockProposal, state: "approved" });

    renderWithClient(
      <AgentProposalCard proposal={mockProposal} eventId="evt-100" canModerate={true} />
    );

    const approveBtn = screen.getByRole("button", { name: /Approve Proposal/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith("run-uuid-1");
    });
  });

  it("shows rejection input and calls reject mutation with explanation", async () => {
    mockReject.mockResolvedValueOnce({ ...mockProposal, state: "rejected" });

    renderWithClient(
      <AgentProposalCard proposal={mockProposal} eventId="evt-100" canModerate={true} />
    );

    const rejectBtn = screen.getByRole("button", { name: /Reject/i });
    fireEvent.click(rejectBtn);

    const input = screen.getByPlaceholderText(/Explain why this proposal was rejected/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "We agreed on an alternative vendor" } });

    const confirmBtn = screen.getByRole("button", { name: /Confirm Reject/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({
        runId: "run-uuid-1",
        reason: "We agreed on an alternative vendor",
      });
    });
  });

  it("renders resolved badge and hides action buttons when proposal is approved", () => {
    const approvedProposal: AgentRun = {
      ...mockProposal,
      state: "approved",
      reviewed_by_email: "planner@apex.com",
      reviewed_at: "2026-10-15T12:00:00Z",
    };

    renderWithClient(
      <AgentProposalCard proposal={approvedProposal} eventId="evt-100" canModerate={true} />
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText(/planner@apex.com/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve Proposal/i })).not.toBeInTheDocument();
  });
});
