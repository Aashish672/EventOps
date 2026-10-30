import React, { useState, useEffect } from "react";
import { X, CalendarCheck, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useGenerateEventPlan } from "../../../hooks/useAgents";
import { AgentRun } from "../../../api/types";

export interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: (run: AgentRun) => void;
}

const PRESET_CATEGORIES = [
  { label: "Corporate Conference", desc: "Keynotes, breakout sessions, and sponsor expo" },
  { label: "Gala & Fundraiser", desc: "Black-tie reception, live auction, and seated dinner" },
  { label: "Music & Cultural Festival", desc: "Multi-stage live performances and vendor stalls" },
  { label: "Executive Retreat", desc: "High-touch strategy workshops and VIP dining" },
  { label: "Community Workshop", desc: "Hands-on training, registration, and networking" },
];

const PRESET_SCALES = [
  { value: "standard", label: "Standard (100–300 attendees)" },
  { value: "large", label: "Large Scale (500–1,000+ attendees)" },
  { value: "intimate", label: "Intimate / VIP (< 50 attendees)" },
];

export const GeneratePlanModal: React.FC<GeneratePlanModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
}) => {
  const [category, setCategory] = useState("Corporate Conference");
  const [scale, setScale] = useState("standard");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useGenerateEventPlan(eventId);

  useEffect(() => {
    if (isOpen) {
      setCategory("Corporate Conference");
      setScale("standard");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !generateMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, generateMutation.isPending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await generateMutation.mutateAsync({
        category,
        scale,
        notes: notes.trim() || "Standard event execution roadmap",
        trigger_reason: `AI Roadmap Synthesis: ${category} (${scale})`,
      });
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate event plan";
      setError(msg);
    }
  };

  return (
    <div
      className="risk-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generateMutation.isPending) {
          onClose();
        }
      }}
    >
      <div className="risk-modal-container" style={{ maxWidth: 600 }}>
        {/* Modal Header */}
        <div className="risk-modal-header">
          <h3 id="plan-modal-title" className="risk-modal-title">
            <CalendarCheck size={20} className="text-indigo-600" style={{ color: "var(--accent-primary, #4f46e5)" }} />
            <span>AI Event Planning Agent</span>
          </h3>
          <button
            type="button"
            className="risk-modal-close-btn"
            onClick={onClose}
            disabled={generateMutation.isPending}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="risk-modal-body">
            <p className="risk-modal-description">
              Overcome the cold-start problem: Synthesize a 5-milestone operational roadmap
              and 12–18 reverse-scheduled tasks tailored to your event timeline and team.
            </p>

            {/* Error Banner */}
            {error && (
              <div
                className="risk-error-banner"
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  color: "#991b1b",
                  fontSize: "0.85rem",
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Event Category Preset Selector */}
            <div className="risk-input-group">
              <label htmlFor="plan-category-select">Event Category / Format</label>
              <select
                id="plan-category-select"
                className="toolbar-select"
                style={{ width: "100%", padding: "0.6rem", borderRadius: 6, border: "1px solid #cbd5e1" }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={generateMutation.isPending}
              >
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat.label} value={cat.label}>
                    {cat.label} — {cat.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Category Chips */}
            <div className="risk-preset-chips" style={{ marginTop: "-0.4rem" }}>
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  className={`risk-preset-chip ${category === cat.label ? "active" : ""}`}
                  style={{
                    background: category === cat.label ? "#e0e7ff" : "#f1f5f9",
                    color: category === cat.label ? "#3730a3" : "#334155",
                    borderColor: category === cat.label ? "#818cf8" : "#e2e8f0",
                  }}
                  onClick={() => setCategory(cat.label)}
                  disabled={generateMutation.isPending}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scale / Headcount Scope */}
            <div className="risk-input-group">
              <label htmlFor="plan-scale-select">Attendee Scale & Scope</label>
              <select
                id="plan-scale-select"
                className="toolbar-select"
                style={{ width: "100%", padding: "0.6rem", borderRadius: 6, border: "1px solid #cbd5e1" }}
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                disabled={generateMutation.isPending}
              >
                {PRESET_SCALES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Notes / Focus Areas */}
            <div className="risk-input-group">
              <label htmlFor="plan-notes-input">
                Specific Focus Areas or Organizer Notes (Optional)
              </label>
              <textarea
                id="plan-notes-input"
                rows={3}
                placeholder="e.g. Prioritize municipal noise permits, multi-track AV tech checks, and dietary catering guarantees..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={generateMutation.isPending}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="risk-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              id="generate-plan-submit-btn"
              data-testid="generate-plan-submit-btn"
              disabled={generateMutation.isPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "var(--accent-primary, #4f46e5)",
              }}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Synthesizing Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate AI Roadmap</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
