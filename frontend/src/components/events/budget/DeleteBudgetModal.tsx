import React from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { BudgetCategory, BudgetLineItem } from "../../../api/types";
import { formatCurrency } from "./budgetUtils";

export type DeleteBudgetTarget =
  | { type: "category"; category: BudgetCategory }
  | { type: "item"; item: BudgetLineItem };

interface DeleteBudgetModalProps {
  isOpen: boolean;
  target: DeleteBudgetTarget | null;
  onClose: () => void;
  onConfirm: (target: { type: "category" | "item"; id: string }) => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteBudgetModal: React.FC<DeleteBudgetModalProps> = ({
  isOpen,
  target,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setError(null);
  }, [isOpen, target]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !target) return null;

  const isCategory = target.type === "category";
  const title = isCategory ? "Delete Budget Category" : "Delete Budget Line Item";
  const subtitle = isCategory
    ? `Are you sure you want to delete "${target.category.name}"?`
    : `Are you sure you want to delete "${target.item.description}"?`;

  const handleDelete = async () => {
    try {
      setError(null);
      const id = isCategory ? target.category.id : target.item.id;
      await onConfirm({ type: target.type, id });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-budget-title"
    >
      <div className="modal-container delete-modal-container" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="delete-modal-title-row">
            <div className="delete-icon-wrap">
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <h3 id="delete-budget-title" className="modal-title">
                {title}
              </h3>
              <p className="modal-subtitle">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="delete-modal-body">
          {error && <div className="form-error-banner" role="alert">{error}</div>}

          <div className="delete-task-preview">
            {isCategory ? (
              <>
                <span className="delete-preview-title">{target.category.name}</span>
                <p className="delete-preview-desc">
                  Allocated: {formatCurrency(target.category.allocated_amount)} •{" "}
                  {target.category.line_items?.length || 0} line items
                </p>
              </>
            ) : (
              <>
                <span className="delete-preview-title">{target.item.description}</span>
                <p className="delete-preview-desc">
                  Cost: {formatCurrency(target.item.actual_cost || target.item.estimated_cost)} •{" "}
                  Status: {target.item.is_paid ? "Paid" : "Unpaid"}
                </p>
              </>
            )}
          </div>

          <p className="delete-warning-text">
            {isCategory
              ? "This action cannot be undone. This category and all of its associated line items will be permanently deleted."
              : "This action cannot be undone. This line item expense will be permanently deleted from the budget."}
          </p>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="spin-icon" style={{ marginRight: 6 }} />
                Deleting...
              </>
            ) : isCategory ? (
              "Delete Category"
            ) : (
              "Delete Item"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
