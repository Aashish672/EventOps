import React from "react";
import { X, Layers, Loader2 } from "lucide-react";
import { BudgetCategory } from "../../../api/types";

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; allocated_amount: string }) => Promise<void>;
  initialCategory?: BudgetCategory | null;
  isSubmitting?: boolean;
}

export const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCategory,
  isSubmitting = false,
}) => {
  const [name, setName] = React.useState("");
  const [allocatedAmount, setAllocatedAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialCategory);

  React.useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name);
      setAllocatedAmount(initialCategory.allocated_amount || "0.00");
    } else {
      setName("");
      setAllocatedAmount("");
    }
    setError(null);
  }, [initialCategory, isOpen]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    const numAmount = parseFloat(allocatedAmount);
    if (allocatedAmount && (Number.isNaN(numAmount) || numAmount < 0)) {
      setError("Allocated amount must be a non-negative number.");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        allocated_amount: allocatedAmount ? numAmount.toFixed(2) : "0.00",
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save category";
      setError(message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
      <div className="modal-container" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={18} color="var(--accent-primary)" />
            <h3 id="category-modal-title" className="modal-title">
              {isEditing ? "Edit Budget Category" : "Add Budget Category"}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-field">
              <label htmlFor="cat-name-input" className="form-label">
                Category Name <span className="required-star">*</span>
              </label>
              <input
                id="cat-name-input"
                type="text"
                className="form-input"
                placeholder="e.g. Venue & Rentals, Catering, Decor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="cat-allocated-input" className="form-label">
                Allocated Budget ($ USD)
              </label>
              <input
                id="cat-allocated-input"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0.00"
                value={allocatedAmount}
                onChange={(e) => setAllocatedAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <span className="field-hint" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Target amount allocated for all expenses in this category.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin-icon" style={{ marginRight: 6 }} />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
