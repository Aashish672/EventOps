import React from "react";
import { DollarSign, Plus, Search, Filter, ChevronsUpDown, Sparkles, X } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useBudgetCategories,
  useUpdateBudgetLineItem,
  useCreateBudgetLineItem,
  useCreateBudgetCategory,
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  useDeleteBudgetLineItem,
} from "../../../hooks/useBudgets";
import { calculateBudgetSummary } from "../budget/budgetUtils";
import { BudgetSummaryCards } from "../budget/BudgetSummaryCards";
import { BudgetCategoryAccordion } from "../budget/BudgetCategoryAccordion";
import { BudgetCategoryModal } from "../budget/BudgetCategoryModal";
import { BudgetLineItemModal } from "../budget/BudgetLineItemModal";
import { DeleteBudgetModal, DeleteBudgetTarget } from "../budget/DeleteBudgetModal";
import { AnalyzeBudgetModal } from "../budget/AnalyzeBudgetModal";
import { BudgetCategory, BudgetLineItem } from "../../../api/types";
import "../budget/budget.css";
import "../agents/agents.css";

export const EventBudgetTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: categories = [], isLoading } = useBudgetCategories(eventId);
  const updateLineItemMutation = useUpdateBudgetLineItem(eventId);
  const createLineItemMutation = useCreateBudgetLineItem(eventId);
  const createCategoryMutation = useCreateBudgetCategory(eventId);
  const updateCategoryMutation = useUpdateBudgetCategory(eventId);
  const deleteCategoryMutation = useDeleteBudgetCategory(eventId);
  const deleteLineItemMutation = useDeleteBudgetLineItem(eventId);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState<"all" | "paid" | "unpaid">("all");
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<BudgetCategory | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BudgetLineItem | null>(null);
  const [defaultItemCategoryId, setDefaultItemCategoryId] = React.useState<string | undefined>(undefined);
  const [deletingTarget, setDeletingTarget] = React.useState<DeleteBudgetTarget | null>(null);
  const [isAnalyzeBudgetModalOpen, setIsAnalyzeBudgetModalOpen] = React.useState(false);
  const [budgetToast, setBudgetToast] = React.useState<{ runId: string; summary: string } | null>(null);

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

  const handleOpenCreateItem = (category?: BudgetCategory) => {
    setEditingItem(null);
    setDefaultItemCategoryId(category?.id);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: BudgetLineItem) => {
    setEditingItem(item);
    setDefaultItemCategoryId(item.category);
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (data: {
    category: string;
    description: string;
    estimated_cost: string;
    actual_cost: string;
    is_paid: boolean;
  }) => {
    if (editingItem) {
      await updateLineItemMutation.mutateAsync({
        id: editingItem.id,
        payload: data,
      });
    } else {
      await createLineItemMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleOpenDeleteCategory = (category: BudgetCategory) => {
    setDeletingTarget({ type: "category", category });
  };

  const handleOpenDeleteItem = (item: BudgetLineItem) => {
    setDeletingTarget({ type: "item", item });
  };

  const handleDeleteConfirm = async (target: { type: "category" | "item"; id: string }) => {
    if (target.type === "category") {
      await deleteCategoryMutation.mutateAsync(target.id);
    } else {
      await deleteLineItemMutation.mutateAsync(target.id);
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
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsAnalyzeBudgetModalOpen(true)}
            id="analyze-budget-btn"
            data-testid="analyze-budget-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            title="Run AI Budget Intelligence agent to analyze variance and overspend"
          >
            <Sparkles size={14} style={{ color: "#059669" }} />
            <span>Analyze Budget</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateCategory}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Add Category
          </button>
        </div>
      </div>

      {/* Budget Analysis Success Notification */}
      {budgetToast && (
        <div
          className="risk-success-notification"
          role="status"
          data-testid="budget-analysis-notification"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sparkles size={16} style={{ color: "#059669" }} />
            <span style={{ fontSize: "0.875rem", color: "#065f46", fontWeight: 500 }}>
              Budget Analysis generated! An auditable proposal is pending review in the Agent Console.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const consoleTab = document.querySelector(
                  '[role="tab"][aria-label*="Agent"]'
                ) as HTMLElement;
                if (consoleTab) consoleTab.click();
              }}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
            >
              Open Agent Console
            </button>
            <button
              type="button"
              onClick={() => setBudgetToast(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#065f46",
                padding: "0.2rem",
              }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

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
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAnalyzeBudgetModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Sparkles size={14} style={{ color: "#059669" }} />
              <span>Analyze Budget</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateCategory}
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              Add First Category
            </button>
          </div>
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
                  onAddItem={handleOpenCreateItem}
                  onEditCategory={handleOpenEditCategory}
                  onEditItem={handleOpenEditItem}
                  onDeleteCategory={handleOpenDeleteCategory}
                  onDeleteItem={handleOpenDeleteItem}
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

      {/* Line Item Create & Edit Modal */}
      <BudgetLineItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSubmit={handleItemSubmit}
        categories={categories}
        initialItem={editingItem}
        defaultCategoryId={defaultItemCategoryId}
        isSubmitting={createLineItemMutation.isPending || updateLineItemMutation.isPending}
      />

      {/* Delete Category or Line Item Modal */}
      <DeleteBudgetModal
        isOpen={Boolean(deletingTarget)}
        target={deletingTarget}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteCategoryMutation.isPending || deleteLineItemMutation.isPending}
      />

      {/* AI Budget Intelligence Modal */}
      <AnalyzeBudgetModal
        isOpen={isAnalyzeBudgetModalOpen}
        onClose={() => setIsAnalyzeBudgetModalOpen(false)}
        eventId={eventId}
        onSuccess={(run) => {
          setBudgetToast({
            runId: run.id,
            summary: "Budget proposal created and ready for review.",
          });
        }}
      />
    </div>
  );
};
