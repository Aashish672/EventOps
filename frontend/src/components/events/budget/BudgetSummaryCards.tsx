import React from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BudgetSummary, formatCurrency } from "./budgetUtils";

interface BudgetSummaryCardsProps {
  summary: BudgetSummary;
}

export const BudgetSummaryCards: React.FC<BudgetSummaryCardsProps> = ({ summary }) => {
  const {
    totalAllocated,
    totalEstimated,
    totalActual,
    totalPaid,
    totalPending,
    estimatedVariance,
    isOverBudget,
    utilizationPercent,
    totalCategoriesCount,
    totalLineItemsCount,
    paidLineItemsCount,
  } = summary;

  return (
    <div className="budget-summary-section" aria-label="Budget Overview Summary">
      {/* Over-Budget Alert Banner */}
      {isOverBudget && (
        <div className="budget-alert-banner" role="alert">
          <AlertTriangle size={18} className="alert-icon" />
          <div className="alert-content">
            <strong>Budget Exceeded:</strong> Projected expenses exceed allocated budget by{" "}
            {formatCurrency(Math.abs(estimatedVariance))}. Consider reallocating funds or adjusting line items.
          </div>
        </div>
      )}

      {/* 4 KPI Cards Grid */}
      <div className="budget-kpi-grid">
        {/* Card 1: Total Allocated */}
        <div className="budget-kpi-card" data-testid="kpi-allocated">
          <div className="kpi-header">
            <span className="kpi-label">Allocated Budget</span>
            <div className="kpi-icon-wrap icon-allocated">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(totalAllocated)}</div>
          <div className="kpi-subtext">
            Across {totalCategoriesCount} {totalCategoriesCount === 1 ? "category" : "categories"}
          </div>
        </div>

        {/* Card 2: Estimated Cost */}
        <div className="budget-kpi-card" data-testid="kpi-estimated">
          <div className="kpi-header">
            <span className="kpi-label">Total Estimated</span>
            <div className="kpi-icon-wrap icon-estimated">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(totalEstimated)}</div>
          <div className="kpi-subtext">
            {totalAllocated > 0 ? (
              estimatedVariance > 0 ? (
                <span className="badge-variance over">
                  +{formatCurrency(estimatedVariance)} over
                </span>
              ) : (
                <span className="badge-variance under">
                  {formatCurrency(Math.abs(estimatedVariance))} under
                </span>
              )
            ) : (
              <span>Estimated planned costs</span>
            )}
          </div>
        </div>

        {/* Card 3: Actual Spend & Utilization */}
        <div className="budget-kpi-card" data-testid="kpi-actual">
          <div className="kpi-header">
            <span className="kpi-label">Actual Spent</span>
            <div className="kpi-icon-wrap icon-actual">
              <Receipt size={16} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(totalActual)}</div>
          <div className="kpi-progress-container">
            <div
              className="kpi-progress-bar"
              role="progressbar"
              aria-valuenow={utilizationPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Budget spend utilization"
            >
              <div
                className={`kpi-progress-fill ${isOverBudget ? "fill-warning" : "fill-normal"}`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <span className="kpi-progress-label">
              {utilizationPercent}% of allocated
            </span>
          </div>
        </div>

        {/* Card 4: Payments (Paid vs Pending) */}
        <div className="budget-kpi-card" data-testid="kpi-payments">
          <div className="kpi-header">
            <span className="kpi-label">Payments Made</span>
            <div className="kpi-icon-wrap icon-paid">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(totalPaid)}</div>
          <div className="kpi-subtext">
            {totalLineItemsCount > 0 ? (
              <span>
                {paidLineItemsCount}/{totalLineItemsCount} paid ({formatCurrency(totalPending)} pending)
              </span>
            ) : (
              <span>No line items logged</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
