import React, { useState } from "react";
import { ProposalDiff } from "../../../api/types";
import { X, Check, AlertCircle, Edit3 } from "lucide-react";

interface EditProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: ProposalDiff;
  onSave: (modifiedDiff: ProposalDiff) => Promise<void>;
  isSaving: boolean;
}

export const EditProposalModal: React.FC<EditProposalModalProps> = ({
  isOpen,
  onClose,
  diff,
  onSave,
  isSaving,
}) => {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(diff, null, 2));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = async () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.mutations)) {
        throw new Error("Diff must contain a 'mutations' array.");
      }
      await onSave(parsed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON syntax.");
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container edit-diff-modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Edit3 size={18} className="modal-icon" />
            <h3>Edit Proposal Diff Before Approval</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Adjust field values or remove specific operations. When applied, EventOps will execute this customized diff through the atomic single write path.
          </p>

          {error && (
            <div className="agent-alert error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label htmlFor="diff-json-editor" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Proposal Diff Payload (JSON)
            </label>
            <textarea
              id="diff-json-editor"
              className="code-textarea"
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={isSaving}
              spellCheck={false}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-code, #1a1e24)",
                color: "var(--text-code, #f0f6fc)",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            disabled={isSaving}
          >
            {isSaving ? (
              <span>Applying Changes...</span>
            ) : (
              <>
                <Check size={14} style={{ marginRight: 6 }} />
                Approve with Custom Diff
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
