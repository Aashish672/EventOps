import { BudgetCategory } from "../../../api/types";

/**
 * Format a numeric or string monetary value as USD currency safely.
 * Returns "$0.00" on null, undefined, or unparseable values.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "$0.00";
  }

  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export interface BudgetSummary {
  totalAllocated: number;
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  totalPending: number;
  remainingBudget: number;
  estimatedVariance: number;
  isOverBudget: boolean;
  utilizationPercent: number;
  totalCategoriesCount: number;
  totalLineItemsCount: number;
  paidLineItemsCount: number;
}

/**
 * Calculate comprehensive budget KPIs from an array of BudgetCategories with nested line_items.
 */
export function calculateBudgetSummary(categories: BudgetCategory[] = []): BudgetSummary {
  let totalAllocated = 0;
  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;
  let totalLineItemsCount = 0;
  let paidLineItemsCount = 0;

  for (const cat of categories) {
    const allocated = parseFloat(cat.allocated_amount) || 0;
    totalAllocated += allocated;

    const items = cat.line_items || [];
    for (const item of items) {
      totalLineItemsCount += 1;
      const estimated = parseFloat(item.estimated_cost) || 0;
      const actual = parseFloat(item.actual_cost) || 0;

      totalEstimated += estimated;
      totalActual += actual;

      if (item.is_paid) {
        paidLineItemsCount += 1;
        // If actual cost is set, count actual; otherwise count estimated
        totalPaid += actual > 0 ? actual : estimated;
      }
    }
  }

  const totalPending = Math.max(0, (totalActual > 0 ? totalActual : totalEstimated) - totalPaid);
  const remainingBudget = totalAllocated - totalActual;
  const estimatedVariance = totalEstimated - totalAllocated;
  const isOverBudget = totalAllocated > 0 && (totalEstimated > totalAllocated || totalActual > totalAllocated);

  const utilizationPercent =
    totalAllocated > 0 ? Math.min(Math.round((totalActual / totalAllocated) * 100), 100) : 0;

  return {
    totalAllocated,
    totalEstimated,
    totalActual,
    totalPaid,
    totalPending,
    remainingBudget,
    estimatedVariance,
    isOverBudget,
    utilizationPercent,
    totalCategoriesCount: categories.length,
    totalLineItemsCount,
    paidLineItemsCount,
  };
}
