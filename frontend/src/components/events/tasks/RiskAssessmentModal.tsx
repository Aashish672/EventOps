import React, { useState, useEffect } from "react";
import { X, ShieldAlert, Sparkles, AlertTriangle } from "lucide-react";
import { useAnalyzeEventRisk } from "../../../hooks/useAgents";
import { AgentRun } from "../../../api/types";

export interface RiskAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: (run: AgentRun) => void;
}

const PRESET_SCENARIOS = [
  {
    label: "AV Vendor Delay",
    text: "Equipment transport truck delayed 3 hours on highway. Stage rigging and audio setup cannot begin until load-in completes.",
  },
  {
    label: "Severe Weather Warning",
    text: "High wind and rain advisory issued. Outdoor setup delayed by 4 hours; need timeline adjustments to preserve rehearsal window.",
  },
  {
    label: "Venue Access Delayed",
    text: "Venue management delayed load-in access by 2 hours. Active setup tasks require proportional shifts.",
  },
  {
    label: "General Schedule Audit",
    text: "Evaluate overall event milestones, active task due dates, and 24-hour setup buffers for schedule conflicts.",
  },
];

export const RiskAssessmentModal: React.FC<RiskAssessmentModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = useAnalyzeEventRisk(eventId);

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
      const result = await analyzeMutation.mutateAsync(reason.trim());
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run risk assessment";
      setError(msg);
    }
  };

  return (
    <div className="risk-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="risk-modal-title">
      <div className="risk-modal-container">
        {/* Modal Header */}
        <div className="risk-modal-header">
          <h3 id="risk-modal-title" className="risk-modal-title">
            <ShieldAlert size={20} className="text-amber-600" />
            <span>AI Risk & Change Impact Agent</span>
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
              Simulate operational disruptions or evaluate current task deadlines. The autonomous agent will analyze
              downstream critical paths, calculate slack margins, and formulate an auditable remediation proposal.
            </p>

            {/* Error Banner */}
            {error && (
              <div className="modal-error-banner" role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.8rem", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: "0.85rem", border: "1px solid #fecaca" }}>
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Incident Reason Field */}
            <div className="risk-input-group">
              <label htmlFor="risk-incident-reason">
                Disruption Incident or Trigger Description (Optional)
              </label>
              <textarea
                id="risk-incident-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe any operational incident, vendor delay, or schedule shift (or select a preset below)..."
                disabled={analyzeMutation.isPending}
                rows={3}
              />
            </div>

            {/* Preset Scenarios */}
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary, #4b5563)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Quick Preset Scenarios
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
              id="submit-risk-analysis-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Sparkles size={15} />
              <span>{analyzeMutation.isPending ? "Analyzing Ripple Effects..." : "Run Risk Assessment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
