import React from "react";
import { X, Receipt, Loader2 } from "lucide-react";
import { BudgetCategory, BudgetLineItem } from "../../../api/types";

interface BudgetLineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category: string;
    description: string;
    estimated_cost: string;
    actual_cost: string;
    is_paid: boolean;
  }) => Promise<void>;
  categories: BudgetCategory[];
  initialItem?: BudgetLineItem | null;
  defaultCategoryId?: string;
  isSubmitting?: boolean;
}

export const BudgetLineItemModal: React.FC<BudgetLineItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialItem,
  defaultCategoryId,
  isSubmitting = false,
}) => {
  const [categoryId, setCategoryId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [estimatedCost, setEstimatedCost] = React.useState("");
  const [actualCost, setActualCost] = React.useState("");
  const [isPaid, setIsPaid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isEditing = Boolean(initialItem);

  React.useEffect(() => {
    if (initialItem) {
      setCategoryId(initialItem.category);
      setDescription(initialItem.description);
      setEstimatedCost(initialItem.estimated_cost || "0.00");
      setActualCost(initialItem.actual_cost || "0.00");
      setIsPaid(initialItem.is_paid);
    } else {
      setCategoryId(defaultCategoryId || (categories.length > 0 ? categories[0].id : ""));
      setDescription("");
      setEstimatedCost("");
      setActualCost("");
      setIsPaid(false);
    }
    setError(null);
  }, [initialItem, defaultCategoryId, categories, isOpen]);

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
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError("Item description is required.");
      return;
    }

    if (!categoryId) {
      setError("Please select a budget category.");
      return;
    }

    const numEstimated = parseFloat(estimatedCost);
    if (estimatedCost && (Number.isNaN(numEstimated) || numEstimated < 0)) {
      setError("Estimated cost must be a non-negative number.");
      return;
    }

    const numActual = parseFloat(actualCost);
    if (actualCost && (Number.isNaN(numActual) || numActual < 0)) {
      setError("Actual cost must be a non-negative number.");
      return;
    }

    try {
      await onSubmit({
        category: categoryId,
        description: trimmedDesc,
        estimated_cost: estimatedCost ? numEstimated.toFixed(2) : "0.00",
        actual_cost: actualCost ? numActual.toFixed(2) : "0.00",
        is_paid: isPaid,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save budget item";
      setError(message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
      <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt size={18} color="var(--accent-primary)" />
            <h3 id="item-modal-title" className="modal-title">
              {isEditing ? "Edit Budget Item" : "Add Budget Line Item"}
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

            {/* Category Select */}
            <div className="form-field">
              <label htmlFor="item-category-select" className="form-label">
                Category <span className="required-star">*</span>
              </label>
              <select
                id="item-category-select"
                className="form-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isSubmitting}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-field">
              <label htmlFor="item-desc-input" className="form-label">
                Description <span className="required-star">*</span>
              </label>
              <input
                id="item-desc-input"
                type="text"
                className="form-input"
                placeholder="e.g. Venue deposit, Dinner buffet, DJ Sound equipment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Two-column Cost Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-field">
                <label htmlFor="item-estimated-input" className="form-label">
                  Estimated Cost ($)
                </label>
                <input
                  id="item-estimated-input"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="item-actual-input" className="form-label">
                  Actual Cost ($)
                </label>
                <input
                  id="item-actual-input"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Payment Status Checkbox */}
            <div className="form-field" style={{ marginTop: "0.25rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  disabled={isSubmitting}
                  style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }}
                />
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Mark this item as paid</span>
              </label>
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
                "Add Line Item"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
