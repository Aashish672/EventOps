import React, { useState, useEffect } from "react";
import { X, FileText, Sparkles, AlertTriangle, ExternalLink } from "lucide-react";
import { useAnalyzeDocument } from "../../../hooks/useAgents";
import { useBudgetCategories } from "../../../hooks/useBudgets";
import { Document, AgentRun, BudgetCategory } from "../../../api/types";

export interface AnalyzeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  eventId: string;
  onSuccess?: (run: AgentRun) => void;
}

const PRESET_SCENARIOS = [
  {
    label: "Contract Item Extraction",
    text: "Extract all quoted line items, vendor name, payment milestones, and compare against category budget.",
  },
  {
    label: "Vendor Rate Negotiation",
    text: "Analyze rates for market inflation and draft a firm negotiation email requesting 10-15% discount or bundled services.",
  },
  {
    label: "Cancellation & Liability Audit",
    text: "Review cancellation policy, liability terms, and deposit refund clauses.",
  },
  {
    label: "Scope & Deliverables Verification",
    text: "Verify deliverables breakdown and formulate draft line items under the target budget category.",
  },
];

export const AnalyzeDocumentModal: React.FC<AnalyzeDocumentModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  eventId,
  onSuccess,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useBudgetCategories(eventId);
  const analyzeMutation = useAnalyzeDocument(eventId);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryId("");
      setNotes("");
      setError(null);
    }
  }, [isOpen, doc]);

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

  if (!isOpen || !doc) return null;

  const selectedCategory = categories.find((c: BudgetCategory) => c.id === selectedCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await analyzeMutation.mutateAsync({
        documentId: doc.id,
        options: {
          target_category_id: selectedCategoryId || undefined,
          target_category_name: selectedCategory?.name || "Vendor Quotes & Contracts",
          notes: notes.trim() || undefined,
          trigger_reason: notes.trim()
            ? `Contract analysis for ${doc.title}: ${notes.trim()}`
            : `AI Contract Analysis for ${doc.title}`,
        },
      });

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to run document intelligence analysis";
      setError(msg);
    }
  };

  return (
    <div
      className="risk-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analyze-doc-title"
    >
      <div className="risk-modal-container">
        {/* Modal Header */}
        <div className="risk-modal-header">
          <h3 id="analyze-doc-title" className="risk-modal-title">
            <FileText size={20} className="text-blue-600" />
            <span>AI Document Intelligence & Vendor Negotiator</span>
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
              Extract vendor deliverables, parse pricing line items, compare against target
              category budgets, and generate negotiation counter-offer proposals.
            </p>

            {/* Target Document Info Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                <FileText size={16} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-main)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={doc.title}
                >
                  {doc.title}
                </span>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.775rem",
                  color: "var(--accent-primary)",
                  textDecoration: "none",
                  flexShrink: 0,
                  marginLeft: 10,
                }}
              >
                <span>View File</span>
                <ExternalLink size={12} />
              </a>
            </div>

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

            {/* Target Budget Category Selector */}
            <div className="risk-input-group">
              <label htmlFor="target-budget-category">
                Target Budget Category (for ceiling comparison)
              </label>
              <select
                id="target-budget-category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={analyzeMutation.isPending}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                  fontSize: "0.875rem",
                }}
              >
                <option value="">
                  Default: Auto-assign (&quot;Vendor Quotes &amp; Contracts&quot;)
                </option>
                {categories.map((cat: BudgetCategory) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} (Allocated: ${parseFloat(cat.allocated_amount || "0").toLocaleString()})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Selected category allocation is used to calculate budget variance and trigger negotiation emails if the quote exceeds the ceiling.
              </span>
            </div>

            {/* Analysis Focus / Notes Field */}
            <div className="risk-input-group">
              <label htmlFor="doc-analysis-notes">
                Negotiation Instructions &amp; Focus (Optional)
              </label>
              <textarea
                id="doc-analysis-notes"
                rows={3}
                placeholder="e.g., Focus on audio equipment pricing; ask for 15% discount; verify net-30 payment terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={analyzeMutation.isPending}
              />
            </div>

            {/* Quick Preset Scenarios */}
            <div className="risk-presets-section">
              <span className="risk-presets-label">
                <Sparkles size={13} style={{ marginRight: 4 }} />
                Quick Preset Scenarios
              </span>
              <div className="risk-preset-chips">
                {PRESET_SCENARIOS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="risk-preset-chip"
                    onClick={() => setNotes(preset.text)}
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
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Sparkles size={15} />
              <span>
                {analyzeMutation.isPending ? "Analyzing Contract..." : "Run Contract Analysis"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
