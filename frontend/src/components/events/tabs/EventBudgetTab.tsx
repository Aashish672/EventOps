import React from "react";
import { DollarSign, Plus, Layers } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useBudgetCategories } from "../../../hooks/useBudgets";
import { calculateBudgetSummary } from "../budget/budgetUtils";
import { BudgetSummaryCards } from "../budget/BudgetSummaryCards";
import "../budget/budget.css";

export const EventBudgetTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: categories = [], isLoading } = useBudgetCategories(eventId);

  const summary = calculateBudgetSummary(categories);

  return (
    <div className="event-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Budget Tracker</h2>
          <p className="tab-pane-description">
            Track allocations, monitor estimated versus actual costs, and log payments for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          title="Add category functionality arriving in Sub-task 3.4.3"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div
          className="placeholder-pulse"
          style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }}
        />
      ) : categories.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <DollarSign size={32} color="#16a34a" />
          </div>
          <h3>No Budget Categories Yet</h3>
          <p>
            Start organizing event expenses by allocating your total budget into categories
            such as Venue, Catering, Audio/Visual, and Decor.
          </p>
          <div className="epic-badge-note">
            <Layers size={13} style={{ marginRight: 4 }} />
            Ready for Sub-task 3.4.2 & 3.4.3: Interactive Categories & Line Items
          </div>
        </div>
      ) : (
        <div className="budget-content-wrap">
          {/* Sub-Task 3.4.1: Budget KPI Overview Cards */}
          <BudgetSummaryCards summary={summary} />

          {/* Sub-Task 3.4.2 will place the interactive Category & Line Items Table here */}
          <div className="budget-categories-placeholder" style={{ marginTop: "1rem" }}>
            <div className="budget-preview-box">
              <div className="budget-preview-categories">
                {categories.map((cat) => (
                  <div key={cat.id} className="budget-preview-row">
                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {cat.line_items?.length || 0} line {cat.line_items?.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
