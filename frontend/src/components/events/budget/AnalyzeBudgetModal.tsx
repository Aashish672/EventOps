import React, { useState, useEffect } from "react";
import { X, DollarSign, Sparkles, AlertTriangle } from "lucide-react";
import { useAnalyzeEventBudget } from "../../../hooks/useAgents";
import { AgentRun } from "../../../api/types";

export interface AnalyzeBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: (run: AgentRun) => void;
}

const PRESET_SCENARIOS = [
  {
    label: "Variance & Overspend Audit",
    text: "Audit actual vs estimated expenses across all line items and flag items exceeding 10% variance.",
  },
  {
    label: "Vendor Booking Realignment",
    text: "Review agreed vendor pricing against budget allocations and suggest reserve buffers.",
  },
  {
    label: "Category Reallocation Check",
    text: "Evaluate surplus categories and recommend reallocation to at-risk or critical categories.",
  },
  {
    label: "Full Budget Health Check",
    text: "Full financial health assessment: calculate health score, project final cost, and formulate line-item adjustments.",
  },
];

export const AnalyzeBudgetModal: React.FC<AnalyzeBudgetModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = useAnalyzeEventBudget(eventId);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !analyzeMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, analyzeMutation.isPending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await analyzeMutation.mutateAsync(reason.trim() || undefined);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run budget intelligence analysis";
      setError(msg);
    }
  };

  return (
    <div
      className="risk-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
    >
      <div className="risk-modal-container">
        {/* Modal Header */}
        <div className="risk-modal-header">
          <h3 id="budget-modal-title" className="risk-modal-title">
            <DollarSign size={20} className="text-emerald-600" />
            <span>AI Budget Intelligence Agent</span>
          </h3>
          <button
            type="button"
            className="risk-modal-close-btn"
            onClick={onClose}
            disabled={analyzeMutation.isPending}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="risk-modal-body">
            <p className="risk-modal-description">
              Analyze budget allocations, detect spending anomalies, and generate auditable
              reallocation proposals. The agent evaluates line item variance and projects final costs
              without altering database records directly.
            </p>

            {/* Error Banner */}
            {error && (
              <div
                className="modal-error-banner"
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.6rem 0.8rem",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  border: "1px solid #fecaca",
                }}
              >
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Analysis Focus / Trigger Reason Field */}
            <div className="risk-input-group">
              <label htmlFor="budget-analysis-reason">
                Analysis Focus or Context (Optional)
              </label>
              <textarea
                id="budget-analysis-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe specific cost concerns or select a quick scenario below..."
                disabled={analyzeMutation.isPending}
                rows={3}
              />
            </div>

            {/* Preset Scenarios */}
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary, #4b5563)",
                  marginBottom: "0.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Quick Analysis Scenarios
              </span>
              <div className="risk-preset-chips">
                {PRESET_SCENARIOS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="risk-preset-chip"
                    onClick={() => setReason(preset.text)}
                    disabled={analyzeMutation.isPending}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="risk-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={analyzeMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={analyzeMutation.isPending}
              id="submit-budget-analysis-btn"
              data-testid="submit-budget-analysis-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#059669",
                borderColor: "#059669",
              }}
            >
              <Sparkles size={15} />
              <span>
                {analyzeMutation.isPending ? "Analyzing Budget Health..." : "Run Budget Analysis"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

