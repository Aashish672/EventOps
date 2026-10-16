import React, { useState } from "react";
import { AgentRun, ProposalDiff } from "../../../api/types";
import { DiffViewer } from "./DiffViewer";
import { EditProposalModal } from "./EditProposalModal";
import {
  useApproveAgentRun,
  useRejectAgentRun,
  useEditApproveAgentRun,
} from "../../../hooks/useAgents";
import {
  ShieldAlert,
  CalendarCheck,
  DollarSign,
  FileText,
  Store,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit,
  Sparkles,
  Clock,
  UserCheck,
} from "lucide-react";

interface AgentProposalCardProps {
  proposal: AgentRun;
  eventId: string;
  canModerate?: boolean;
}

export const AgentProposalCard: React.FC<AgentProposalCardProps> = ({
  proposal,
  eventId,
  canModerate = true,
}) => {
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useApproveAgentRun(eventId);
  const rejectMutation = useRejectAgentRun(eventId);
  const editApproveMutation = useEditApproveAgentRun(eventId);

  const getAgentPersona = (type: string) => {
    switch (type) {
      case "risk_change_impact":
        return {
          name: "Risk & Change Impact Agent",
          badgeClass: "badge-risk",
          icon: <ShieldAlert size={16} />,
        };
      case "event_planning":
        return {
          name: "Event Planning Agent",
          badgeClass: "badge-planning",
          icon: <CalendarCheck size={16} />,
        };
      case "budget_intelligence":
        return {
          name: "Budget Intelligence Agent",
          badgeClass: "badge-budget",
          icon: <DollarSign size={16} />,
        };
      case "document_intelligence":
        return {
          name: "Document Intelligence Agent",
          badgeClass: "badge-doc",
          icon: <FileText size={16} />,
        };
      case "vendor_evaluation":
        return {
          name: "Vendor Evaluation Agent",
          badgeClass: "badge-vendor",
          icon: <Store size={16} />,
        };
      default:
        return {
          name: "AI Agent",
          badgeClass: "badge-default",
          icon: <Sparkles size={16} />,
        };
    }
  };

  const persona = getAgentPersona(proposal.agent_type);
  const isPending = proposal.state === "pending";

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(proposal.id);
    } catch {
      // Error handled by query/mutation state
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rejectMutation.mutateAsync({
        runId: proposal.id,
        reason: rejectReason,
      });
      setIsRejecting(false);
    } catch {
      // Handled by query
    }
  };

  const handleCustomDiffSave = async (modifiedDiff: ProposalDiff) => {
    await editApproveMutation.mutateAsync({
      runId: proposal.id,
      modifiedDiff,
    });
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case "approved":
        return <span className="proposal-state-badge state-approved">Approved</span>;
      case "edited_approved":
        return <span className="proposal-state-badge state-edited">Edited & Approved</span>;
      case "rejected":
        return <span className="proposal-state-badge state-rejected">Rejected</span>;
      case "pending":
      default:
        return <span className="proposal-state-badge state-pending">Pending Review</span>;
    }
  };

  return (
    <div className={`agent-proposal-card ${proposal.state}`} data-testid={`agent-proposal-${proposal.id}`}>
      {/* Top Banner */}
      <div className="proposal-card-header">
        <div className="proposal-header-left">
          <div className={`agent-persona-pill ${persona.badgeClass}`}>
            {persona.icon}
            <span>{persona.name}</span>
          </div>
          <div className="proposal-meta-time">
            <Clock size={13} style={{ marginRight: 4 }} />
            <span>{new Date(proposal.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="proposal-header-right">{getStateBadge(proposal.state)}</div>
      </div>

      {/* Trigger statement */}
      <div className="proposal-trigger-box">
        <span className="trigger-label">Trigger Condition:</span>
        <span className="trigger-text">{proposal.trigger}</span>
      </div>

      {/* Expandable Reasoning Trace */}
      {proposal.reasoning && (
        <div className="proposal-reasoning-accordion">
          <button
            type="button"
            className="reasoning-toggle-btn"
            onClick={() => setIsReasoningOpen((prev) => !prev)}
            aria-expanded={isReasoningOpen}
          >
            <span className="reasoning-title">
              <Sparkles size={14} style={{ marginRight: 6 }} />
              Agent Reasoning & Chain-of-Thought
            </span>
            {isReasoningOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isReasoningOpen && (
            <div className="reasoning-content-box">
              <p>{proposal.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Visual Diff Component */}
      <div className="proposal-diff-section">
        <DiffViewer diff={proposal.final_diff || proposal.proposed_diff} />
      </div>

      {/* Audit Review info if resolved */}
      {!isPending && proposal.reviewed_at && (
        <div className="proposal-reviewed-footer">
          <UserCheck size={14} style={{ marginRight: 6 }} />
          <span>
            Reviewed by <strong>{proposal.reviewed_by_email || "Planner"}</strong> on{" "}
            {new Date(proposal.reviewed_at).toLocaleString()}
          </span>
        </div>
      )}

      {/* Mutation Action Bar (Only for PENDING proposals) */}
      {isPending && canModerate && (
        <div className="proposal-action-bar">
          {!isRejecting ? (
            <div className="action-buttons-group">
              <button
                type="button"
                className="btn btn-primary btn-approve"
                onClick={handleApprove}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                id={`approve-btn-${proposal.id}`}
              >
                <Check size={15} style={{ marginRight: 6 }} />
                {approveMutation.isPending ? "Applying Changes..." : "Approve Proposal"}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-edit-diff"
                onClick={() => setIsEditModalOpen(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                id={`edit-btn-${proposal.id}`}
              >
                <Edit size={14} style={{ marginRight: 6 }} />
                Edit Diff
              </button>

              <button
                type="button"
                className="btn btn-danger-outline btn-reject"
                onClick={() => setIsRejecting(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                id={`reject-btn-${proposal.id}`}
              >
                <X size={14} style={{ marginRight: 6 }} />
                Reject
              </button>
            </div>
          ) : (
            <form onSubmit={handleRejectSubmit} className="reject-feedback-form">
              <div className="form-group reject-input-group">
                <input
                  type="text"
                  className="form-input reject-reason-input"
                  placeholder="Optional: Explain why this proposal was rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRejecting(false)}
                  disabled={rejectMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Error alerts if mutation fails */}
          {(approveMutation.isError || rejectMutation.isError || editApproveMutation.isError) && (
            <div className="agent-alert error" style={{ marginTop: "0.75rem" }} role="alert">
              <span>
                {approveMutation.error?.message ||
                  rejectMutation.error?.message ||
                  editApproveMutation.error?.message ||
                  "Action could not be completed."}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditProposalModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          diff={proposal.proposed_diff}
          onSave={handleCustomDiffSave}
          isSaving={editApproveMutation.isPending}
        />
      )}
    </div>
  );
};
