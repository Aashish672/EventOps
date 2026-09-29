import React from "react";
import { CheckCircle2, Clock, MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { BudgetLineItem } from "../../../api/types";
import { formatCurrency } from "./budgetUtils";

interface BudgetLineItemRowProps {
  item: BudgetLineItem;
  onTogglePaid: (item: BudgetLineItem) => void;
  isUpdating?: boolean;
  onEdit?: (item: BudgetLineItem) => void;
  onDelete?: (item: BudgetLineItem) => void;
}

export const BudgetLineItemRow: React.FC<BudgetLineItemRowProps> = ({
  item,
  onTogglePaid,
  isUpdating = false,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  return (
    <tr className={`budget-item-row ${item.is_paid ? "item-paid" : ""} ${isUpdating ? "item-updating" : ""}`}>
      {/* Quick Pay Checkbox / Toggle */}
      <td className="cell-checkbox">
        <button
          type="button"
          className={`budget-pay-toggle ${item.is_paid ? "paid" : "pending"}`}
          onClick={() => onTogglePaid(item)}
          disabled={isUpdating}
          title={item.is_paid ? "Mark as unpaid" : "Mark as paid"}
          aria-label={item.is_paid ? `Mark ${item.description} as unpaid` : `Mark ${item.description} as paid`}
        >
          {isUpdating ? (
            <Loader2 size={16} className="spin-icon" />
          ) : item.is_paid ? (
            <CheckCircle2 size={16} />
          ) : (
            <div className="checkbox-empty" />
          )}
        </button>
      </td>

      {/* Description */}
      <td className="cell-desc">
        <span className={`item-description ${item.is_paid ? "text-paid-strike" : ""}`}>
          {item.description}
        </span>
      </td>

      {/* Estimated Cost */}
      <td className="cell-amount text-muted">
        {formatCurrency(item.estimated_cost)}
      </td>

      {/* Actual Cost */}
      <td className="cell-amount font-semibold">
        {formatCurrency(item.actual_cost)}
      </td>

      {/* Payment Status Badge */}
      <td className="cell-status">
        {item.is_paid ? (
          <span className="budget-status-pill pill-paid">
            <CheckCircle2 size={12} style={{ marginRight: 4 }} />
            Paid
          </span>
        ) : (
          <span className="budget-status-pill pill-pending">
            <Clock size={12} style={{ marginRight: 4 }} />
            Unpaid
          </span>
        )}
      </td>

      {/* Row Actions Menu */}
      <td className="cell-actions">
        <div className="budget-row-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="row-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`Actions for ${item.description}`}
            title="Options"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div className="budget-dropdown-menu" role="menu">
              <button
                type="button"
                className="budget-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit?.(item);
                }}
              >
                <Edit2 size={13} />
                Edit Item
              </button>
              <button
                type="button"
                className="budget-dropdown-item item-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.(item);
                }}
              >
                <Trash2 size={13} />
                Delete Item
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
