import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { BudgetCategory, BudgetLineItem } from "../../../api/types";
import { formatCurrency } from "./budgetUtils";
import { BudgetLineItemRow } from "./BudgetLineItemRow";

interface BudgetCategoryAccordionProps {
  category: BudgetCategory;
  isExpanded: boolean;
  onToggleExpand: (categoryId: string) => void;
  onTogglePaid: (item: BudgetLineItem) => void;
  updatingItemId?: string | null;
  onAddItem?: (category: BudgetCategory) => void;
  onEditCategory?: (category: BudgetCategory) => void;
  onDeleteCategory?: (category: BudgetCategory) => void;
  onEditItem?: (item: BudgetLineItem) => void;
  onDeleteItem?: (item: BudgetLineItem) => void;
}

export const BudgetCategoryAccordion: React.FC<BudgetCategoryAccordionProps> = ({
  category,
  isExpanded,
  onToggleExpand,
  onTogglePaid,
  updatingItemId,
  onAddItem,
  onEditCategory,
  onDeleteCategory,
  onEditItem,
  onDeleteItem,
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

  const allocated = parseFloat(category.allocated_amount) || 0;
  const lineItems = category.line_items || [];

  const totalActual = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.actual_cost) || 0),
    0
  );
  const totalEstimated = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.estimated_cost) || 0),
    0
  );

  const isOverAllocated = allocated > 0 && (totalActual > allocated || totalEstimated > allocated);
  const utilizationPercent =
    allocated > 0 ? Math.min(Math.round((totalActual / allocated) * 100), 100) : 0;

  return (
    <div className={`budget-category-card ${isExpanded ? "expanded" : ""}`} data-testid={`category-card-${category.id}`}>
      {/* Category Header Row */}
      <div className="budget-category-header">
        <button
          type="button"
          className="category-expand-btn"
          onClick={() => onToggleExpand(category.id)}
          aria-expanded={isExpanded}
          aria-label={`Toggle ${category.name} category line items`}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span className="category-name">{category.name}</span>
          <span className="category-item-count">
            {lineItems.length} {lineItems.length === 1 ? "item" : "items"}
          </span>
          {isOverAllocated && (
            <span className="category-warning-badge" title="Category expenses exceed allocated budget">
              <AlertCircle size={12} style={{ marginRight: 3 }} />
              Over Budget
            </span>
          )}
        </button>

        {/* Category Financial Snapshot */}
        <div className="category-header-metrics">
          <div className="category-metric-group">
            <span className="metric-label">Allocated:</span>
            <span className="metric-value font-semibold">{formatCurrency(allocated)}</span>
          </div>

          <div className="category-metric-group">
            <span className="metric-label">Spent:</span>
            <span className={`metric-value ${isOverAllocated ? "text-danger" : ""}`}>
              {formatCurrency(totalActual)}
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="category-mini-progress" title={`${utilizationPercent}% of category budget spent`}>
            <div className="mini-progress-track">
              <div
                className={`mini-progress-fill ${isOverAllocated ? "fill-danger" : "fill-success"}`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <span className="mini-progress-text">{utilizationPercent}%</span>
          </div>

          {/* Action CTAs */}
          <div className="category-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddItem?.(category)}
              title={`Add item to ${category.name}`}
            >
              <Plus size={13} style={{ marginRight: 4 }} />
              Add Item
            </button>

            {/* Category Options Menu */}
            <div className="category-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="category-menu-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={`Options for ${category.name}`}
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
                      onEditCategory?.(category);
                    }}
                  >
                    <Edit2 size={13} />
                    Edit Category
                  </button>
                  <button
                    type="button"
                    className="budget-dropdown-item item-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteCategory?.(category);
                    }}
                  >
                    <Trash2 size={13} />
                    Delete Category
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Child: Line Items Nested Table */}
      {isExpanded && (
        <div className="category-line-items-panel">
          {lineItems.length === 0 ? (
            <div className="category-empty-items">
              <p>No line items logged in this category yet.</p>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onAddItem?.(category)}
              >
                <Plus size={13} style={{ marginRight: 4 }} />
                Add First Line Item
              </button>
            </div>
          ) : (
            <div className="budget-table-responsive">
              <table className="budget-line-items-table" aria-label={`${category.name} Line Items`}>
                <thead>
                  <tr>
                    <th style={{ width: "36px" }} aria-label="Paid Status">Paid</th>
                    <th>Description</th>
                    <th style={{ width: "120px" }}>Estimated</th>
                    <th style={{ width: "120px" }}>Actual</th>
                    <th style={{ width: "100px" }}>Status</th>
                    <th style={{ width: "40px" }} aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <BudgetLineItemRow
                      key={item.id}
                      item={item}
                      onTogglePaid={onTogglePaid}
                      isUpdating={updatingItemId === item.id}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
