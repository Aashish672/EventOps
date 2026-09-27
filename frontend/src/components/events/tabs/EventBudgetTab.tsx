import React from "react";
import { DollarSign, Plus, Search, Filter, ChevronsUpDown } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useBudgetCategories,
  useUpdateBudgetLineItem,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
} from "../../../hooks/useBudgets";
import { calculateBudgetSummary } from "../budget/budgetUtils";
import { BudgetSummaryCards } from "../budget/BudgetSummaryCards";
import { BudgetCategoryAccordion } from "../budget/BudgetCategoryAccordion";
import { BudgetCategoryModal } from "../budget/BudgetCategoryModal";
import { BudgetCategory, BudgetLineItem } from "../../../api/types";
import "../budget/budget.css";

export const EventBudgetTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: categories = [], isLoading } = useBudgetCategories(eventId);
  const updateLineItemMutation = useUpdateBudgetLineItem(eventId);
  const createCategoryMutation = useCreateBudgetCategory(eventId);
  const updateCategoryMutation = useUpdateBudgetCategory(eventId);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState<"all" | "paid" | "unpaid">("all");
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<BudgetCategory | null>(null);

  // Initialize all categories as expanded when data first loads
  React.useEffect(() => {
    if (categories.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          return new Set(categories.map((c) => c.id));
        }
        return prev;
      });
    }
  }, [categories]);

  const summary = calculateBudgetSummary(categories);

  const handleToggleExpand = (categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (expandedIds.size === categories.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleTogglePaid = async (item: BudgetLineItem) => {
    setUpdatingItemId(item.id);
    try {
      await updateLineItemMutation.mutateAsync({
        id: item.id,
        payload: { is_paid: !item.is_paid },
      });
    } catch {
      // Invalidation handled by hook onSuccess; errors caught to prevent unhandled rejections
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setPaymentFilter("all");
  };

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: BudgetCategory) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (data: { name: string; allocated_amount: string }) => {
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        payload: data,
      });
    } else {
      await createCategoryMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  // Filter categories and line items based on search and payment status
  const filteredCategories = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .map((cat) => {
        const catMatches = !query || cat.name.toLowerCase().includes(query);

        const filteredItems = (cat.line_items || []).filter((item) => {
          // Payment status filter
          if (paymentFilter === "paid" && !item.is_paid) return false;
          if (paymentFilter === "unpaid" && item.is_paid) return false;

          // Search query filter (if category matched, show all items matching payment; otherwise item must match)
          if (!query || catMatches) return true;
          return item.description.toLowerCase().includes(query);
        });

        // Keep category if it matches search or has matching line items
        if (catMatches || filteredItems.length > 0) {
          return {
            ...cat,
            line_items: filteredItems,
          };
        }
        return null;
      })
      .filter((cat): cat is typeof categories[number] => cat !== null);
  }, [categories, searchQuery, paymentFilter]);

  const allExpanded = categories.length > 0 && expandedIds.size === categories.length;

  return (
    <div className="event-tab-pane">
      {/* Top Header */}
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
          onClick={handleOpenCreateCategory}
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateCategory}
            style={{ marginTop: "1rem" }}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Add First Category
          </button>
        </div>
      ) : (
        <div className="budget-content-wrap">
          {/* Sub-Task 3.4.1: Budget KPI Overview Cards */}
          <BudgetSummaryCards summary={summary} />

          {/* Sub-Task 3.4.2: Toolbar & Filters */}
          <div className="budget-toolbar">
            <div className="budget-toolbar-left">
              {/* Search Box */}
              <div className="budget-search-wrap">
                <Search size={14} className="budget-search-icon" />
                <input
                  type="text"
                  className="budget-search-input"
                  placeholder="Search categories or items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search categories or items"
                />
              </div>

              {/* Payment Status Filter */}
              <div className="budget-filter-wrap">
                <select
                  className="budget-filter-select"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as "all" | "paid" | "unpaid")}
                  aria-label="Filter expenses by payment status"
                >
                  <option value="all">All Expenses</option>
                  <option value="paid">Paid Only</option>
                  <option value="unpaid">Unpaid Only</option>
                </select>
              </div>
            </div>

            <div className="budget-toolbar-right">
              <button
                type="button"
                className="btn-expand-all"
                onClick={handleToggleAll}
                aria-label={allExpanded ? "Collapse all categories" : "Expand all categories"}
              >
                <ChevronsUpDown size={14} />
                <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
              </button>
            </div>
          </div>

          {/* Nested Categories Accordion List */}
          {filteredCategories.length === 0 ? (
            <div className="event-state-box empty-state">
              <div className="event-state-icon">
                <Filter size={24} color="var(--text-muted)" />
              </div>
              <h3>No Matching Expenses</h3>
              <p>No categories or line items matched your current filter criteria.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearFilters}
                style={{ marginTop: "0.5rem" }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="budget-categories-list" role="region" aria-label="Budget Categories Table">
              {filteredCategories.map((cat) => (
                <BudgetCategoryAccordion
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedIds.has(cat.id)}
                  onToggleExpand={handleToggleExpand}
                  onTogglePaid={handleTogglePaid}
                  updatingItemId={updatingItemId}
                  onEditCategory={handleOpenEditCategory}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Create & Edit Modal */}
      <BudgetCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCategorySubmit}
        initialCategory={editingCategory}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
      />
    </div>
  );
};
