import React from "react";
import { DollarSign, Plus, Sparkles } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useBudgetCategories } from "../../../hooks/useBudgets";

export const EventBudgetTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: categories = [], isLoading } = useBudgetCategories(eventId);

  const totalAllocated = categories.reduce(
    (sum, c) => sum + (parseFloat(c.allocated_amount) || 0),
    0
  );

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
          title="Create category functionality arriving in Epic 3.4"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Category
          <span className="soon-pill" style={{ marginLeft: 6 }}>Epic 3.4</span>
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : categories.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <DollarSign size={28} color="#16a34a" />
          </div>
          <h3>Budget Not Yet Allocated</h3>
          <p>
            The interactive budget tables, category allocations, and line-item cost trackers will be activated in <strong>Epic 3.4</strong>.
          </p>
          <div className="epic-badge-note">
            <Sparkles size={13} style={{ marginRight: 4 }} />
            Ready for Epic 3.4: Budget Tracker UI
          </div>
        </div>
      ) : (
        <div className="budget-preview-box">
          <div className="budget-preview-total">
            <span>Total Allocated Budget:</span>
            <strong>${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className="budget-preview-categories">
            {categories.map((cat) => (
              <div key={cat.id} className="budget-preview-row">
                <span>{cat.name}</span>
                <span>${parseFloat(cat.allocated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
