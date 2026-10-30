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

  it("renders risk severity badge and impact summary callout when provided in diff", () => {
    const riskProposal: AgentRun = {
      ...mockProposal,
      proposed_diff: {
        mutations: [],
        risk_severity: "critical",
        impact_summary: "Critical schedule cascade identified: 3 downstream milestones violate 24h setup buffer.",
      },
    };

    renderWithClient(
      <AgentProposalCard proposal={riskProposal} eventId="evt-100" canModerate={true} />
    );

    const severityBadge = screen.getByTestId("risk-severity-badge");
    expect(severityBadge).toBeInTheDocument();
    expect(severityBadge).toHaveTextContent("CRITICAL RISK");
    expect(severityBadge).toHaveClass("severity-critical");

    const impactBox = screen.getByTestId("proposal-impact-summary");
    expect(impactBox).toBeInTheDocument();
    expect(impactBox).toHaveTextContent(/Critical schedule cascade identified/i);
    expect(impactBox).toHaveTextContent("Executive Impact Assessment");
  });

  it("renders medium and high severity badges correctly", () => {
    const highRiskProposal: AgentRun = {
      ...mockProposal,
      proposed_diff: {
        mutations: [],
        risk_severity: "high",
        impact_summary: "High risk vendor delay.",
      },
    };

    renderWithClient(
      <AgentProposalCard proposal={highRiskProposal} eventId="evt-100" canModerate={true} />
    );

    const badge = screen.getByTestId("risk-severity-badge");
    expect(badge).toHaveTextContent("HIGH RISK");
    expect(badge).toHaveClass("severity-high");
  });

  it("renders event planning roadmap plan summary and milestone pills for event_planning agent", () => {
    const planningProposal: AgentRun = {
      ...mockProposal,
      id: "run-plan-1",
      agent_type: "event_planning",
      trigger: "AI Roadmap Synthesis: Corporate Conference",
      reasoning: "Constructed 5-milestone roadmap reverse-scheduled from event date.",
      proposed_diff: {
        mutations: [],
        plan_summary: "Comprehensive 120-day reverse-scheduled operational roadmap.",
        event_category: "Corporate Conference",
        milestones: [
          { name: "Concept & Feasibility", target_date: "2026-09-01T00:00:00Z" },
          { name: "Venue Contracting", target_date: "2026-10-01T00:00:00Z" },
        ],
      },
    };

    renderWithClient(
      <AgentProposalCard proposal={planningProposal} eventId="evt-100" canModerate={true} />
    );

    expect(screen.getByText("Event Planning Agent")).toBeInTheDocument();
    const planBox = screen.getByTestId("proposal-plan-summary");
    expect(planBox).toBeInTheDocument();
    expect(planBox).toHaveTextContent("Operational Roadmap Strategy (Corporate Conference)");
    expect(planBox).toHaveTextContent("Comprehensive 120-day reverse-scheduled operational roadmap.");
    expect(screen.getByText("Phase 1: Concept & Feasibility")).toBeInTheDocument();
    expect(screen.getByText("Phase 2: Venue Contracting")).toBeInTheDocument();
  });
});

