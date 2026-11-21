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
  AlertTriangle,
  Mail,
  Copy,
  CheckCheck,
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
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(true);
  const [copiedDraft, setCopiedDraft] = useState(false);

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

  const currentDiff = proposal.final_diff || proposal.proposed_diff;
  const riskSeverity = (currentDiff as { risk_severity?: string })?.risk_severity;
  const impactSummary = (currentDiff as { impact_summary?: string })?.impact_summary;
  const planSummary = (currentDiff as { plan_summary?: string })?.plan_summary;
  const eventCategory = (currentDiff as { event_category?: string })?.event_category;
  const milestones = ((currentDiff as { milestones?: Array<{ name: string; target_date?: string }> })?.milestones) || [];

  // Contract Intelligence & Vendor Negotiation fields
  const diffAny = currentDiff as Record<string, unknown> | null;
  const snapshotAny = proposal.input_snapshot as Record<string, unknown> | null;

  const vendorName = (diffAny?.vendor_name as string) || (snapshotAny?.vendor_name as string);
  const totalQuotedAmount = (diffAny?.total_quoted_amount as string) || (snapshotAny?.total_quoted_amount as string);
  const budgetStatus = (diffAny?.budget_status as string) || (snapshotAny?.budget_status as string);
  const varianceAmount = diffAny?.variance_amount as string | undefined;
  const paymentTerms = diffAny?.payment_terms as string | undefined;
  const cancellationTerms = diffAny?.cancellation_terms as string | undefined;
  const negotiationDraft = diffAny?.negotiation_draft as string | undefined;
  const targetCategoryName = snapshotAny?.target_category_name as string | undefined;

  const handleCopyNegotiationDraft = () => {
    if (negotiationDraft) {
      navigator.clipboard.writeText(negotiationDraft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const getRiskSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const normalized = severity.toLowerCase();
    switch (normalized) {
      case "critical":
        return (
          <span className="risk-severity-badge severity-critical" data-testid="risk-severity-badge">
            <AlertTriangle size={12} style={{ marginRight: 4 }} />
            CRITICAL RISK
          </span>
        );
      case "high":
        return (
          <span className="risk-severity-badge severity-high" data-testid="risk-severity-badge">
            <AlertTriangle size={12} style={{ marginRight: 4 }} />
            HIGH RISK
          </span>
        );
      case "medium":
        return (
          <span className="risk-severity-badge severity-medium" data-testid="risk-severity-badge">
            <ShieldAlert size={12} style={{ marginRight: 4 }} />
            MEDIUM RISK
          </span>
        );
      case "low":
        return (
          <span className="risk-severity-badge severity-low" data-testid="risk-severity-badge">
            <ShieldAlert size={12} style={{ marginRight: 4 }} />
            LOW RISK
          </span>
        );
      default:
        return (
          <span className="risk-severity-badge severity-medium" data-testid="risk-severity-badge">
            <ShieldAlert size={12} style={{ marginRight: 4 }} />
            {severity.toUpperCase()} RISK
          </span>
        );
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
          {getRiskSeverityBadge(riskSeverity)}
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

      {/* Executive Impact Summary Callout */}
      {impactSummary && (
        <div className="proposal-impact-summary-box" data-testid="proposal-impact-summary">
          <div className="impact-summary-header">
            <ShieldAlert size={16} className="impact-summary-icon" />
            <span className="impact-summary-title">Executive Impact Assessment</span>
          </div>
          <p className="impact-summary-text">{impactSummary}</p>
        </div>
      )}

      {/* Executive Roadmap Plan Summary Callout */}
      {planSummary && (
        <div
          className="proposal-impact-summary-box"
          data-testid="proposal-plan-summary"
          style={{ background: "#f5f3ff", borderColor: "#ddd6fe" }}
        >
          <div className="impact-summary-header">
            <CalendarCheck size={16} className="impact-summary-icon" style={{ color: "#7c3aed" }} />
            <span className="impact-summary-title" style={{ color: "#5b21b6" }}>
              Operational Roadmap Strategy ({eventCategory || "General Event"})
            </span>
          </div>
          <p className="impact-summary-text" style={{ color: "#4c1d95" }}>{planSummary}</p>
          {milestones.length > 0 && (
            <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {milestones.map((m: { name: string; target_date?: string }, idx: number) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    background: "#ede9fe",
                    color: "#5b21b6",
                    borderRadius: "4px",
                    fontWeight: 500,
                  }}
                >
                  Phase {idx + 1}: {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contract Extraction & Negotiation Assessment Callout */}
      {(proposal.agent_type === "document_intelligence" || vendorName || negotiationDraft) && (
        <div
          className="proposal-impact-summary-box"
          data-testid="proposal-contract-summary"
          style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
        >
          <div className="impact-summary-header" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={16} className="impact-summary-icon" style={{ color: "#0284c7" }} />
              <span className="impact-summary-title" style={{ color: "#0369a1" }}>
                Contract Extraction &amp; Negotiation Summary
              </span>
            </div>
            {budgetStatus && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "4px",
                  background: budgetStatus === "within_budget" ? "#dcfce7" : "#fee2e2",
                  color: budgetStatus === "within_budget" ? "#15803d" : "#b91c1c",
                  border: `1px solid ${budgetStatus === "within_budget" ? "#bbf7d0" : "#fecaca"}`,
                }}
                data-testid="contract-budget-status-badge"
              >
                {budgetStatus === "within_budget" ? "Within Budget" : "Exceeds Budget"}
                {varianceAmount && parseFloat(varianceAmount) > 0 && ` (+$${parseFloat(varianceAmount).toLocaleString()})`}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
              marginTop: "0.6rem",
              fontSize: "0.8125rem",
            }}
          >
            {vendorName && (
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Quoted Vendor</span>
                <strong style={{ color: "var(--text-main)" }}>{vendorName}</strong>
              </div>
            )}
            {totalQuotedAmount && (
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Total Quoted Amount</span>
                <strong style={{ color: "#0369a1" }}>
                  ${parseFloat(totalQuotedAmount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            )}
            {targetCategoryName && (
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Target Category</span>
                <span style={{ color: "var(--text-main)" }}>{targetCategoryName}</span>
              </div>
            )}
            {paymentTerms && (
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Payment Terms</span>
                <span style={{ color: "var(--text-main)" }}>{paymentTerms}</span>
              </div>
            )}
            {cancellationTerms && (
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Cancellation Policy</span>
                <span style={{ color: "var(--text-main)" }}>{cancellationTerms}</span>
              </div>
            )}
          </div>

          {/* Negotiation Email Draft Section */}
          {negotiationDraft && (
            <div
              style={{
                marginTop: "0.85rem",
                padding: "0.75rem",
                background: "#ffffff",
                border: "1px solid #e0f2fe",
                borderRadius: "6px",
              }}
              data-testid="negotiation-draft-box"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: isNegotiationOpen ? "0.5rem" : 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNegotiationOpen((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    color: "#0369a1",
                    padding: 0,
                  }}
                  aria-expanded={isNegotiationOpen}
                >
                  <Mail size={14} />
                  <span>Vendor Negotiation Counter-Offer Draft</span>
                  {isNegotiationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <button
                  type="button"
                  onClick={handleCopyNegotiationDraft}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.5rem",
                    background: copiedDraft ? "#dcfce7" : "#f1f5f9",
                    color: copiedDraft ? "#15803d" : "var(--text-main)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title="Copy email to clipboard"
                  aria-label="Copy negotiation email"
                >
                  {copiedDraft ? <CheckCheck size={12} /> : <Copy size={12} />}
                  <span>{copiedDraft ? "Copied!" : "Copy Email"}</span>
                </button>
              </div>

              {isNegotiationOpen && (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "inherit",
                    fontSize: "0.8125rem",
                    lineHeight: 1.5,
                    color: "#1e293b",
                    margin: 0,
                    padding: "0.5rem",
                    background: "#f8fafc",
                    borderRadius: "4px",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  {negotiationDraft}
                </pre>
              )}
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
