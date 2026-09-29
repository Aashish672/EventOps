import React from "react";
import { Store, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { VendorSummaryMetrics, formatCurrency } from "./vendorUtils";

interface VendorSummaryCardsProps {
  summary: VendorSummaryMetrics;
}

export const VendorSummaryCards: React.FC<VendorSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="vendor-summary-section">
      <div className="vendor-kpi-grid">
        {/* Card 1: Total Bookings */}
        <div className="vendor-kpi-card" data-testid="kpi-vendor-total">
          <div className="kpi-header">
            <span className="kpi-label">Total Bookings</span>
            <div className="kpi-icon-wrap icon-vendor-total">
              <Store size={16} />
            </div>
          </div>
          <div className="kpi-value">{summary.totalBookings}</div>
          <div className="kpi-subtext">
            {summary.bookedCount} confirmed • {summary.inProgressCount} in progress
          </div>
        </div>

        {/* Card 2: Confirmed / Booked */}
        <div className="vendor-kpi-card" data-testid="kpi-vendor-booked">
          <div className="kpi-header">
            <span className="kpi-label">Confirmed / Booked</span>
            <div className="kpi-icon-wrap icon-vendor-booked">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value">{summary.bookedCount}</div>
          <div className="kpi-subtext">
            {summary.totalBookings > 0
              ? `${summary.bookedPercentage}% of vendor pipeline secured`
              : "No vendor bookings yet"}
          </div>
          <div className="kpi-progress-container">
            <div
              className="kpi-progress-bar"
              style={{
                width: `${summary.bookedPercentage}%`,
                background: "#059669",
              }}
            />
          </div>
        </div>

        {/* Card 3: Inquiries & Contracts */}
        <div className="vendor-kpi-card" data-testid="kpi-vendor-inquiry">
          <div className="kpi-header">
            <span className="kpi-label">Inquiries & Contracts</span>
            <div className="kpi-icon-wrap icon-vendor-inquiry">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value">{summary.inProgressCount}</div>
          <div className="kpi-subtext">
            {summary.inProgressCount === 1
              ? "1 vendor awaiting contract or response"
              : `${summary.inProgressCount} vendors awaiting contract or response`}
          </div>
        </div>

        {/* Card 4: Contracted Spend */}
        <div className="vendor-kpi-card" data-testid="kpi-vendor-spend">
          <div className="kpi-header">
            <span className="kpi-label">Contracted Spend</span>
            <div className="kpi-icon-wrap icon-vendor-spend">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(summary.contractedSpend)}</div>
          <div className="kpi-subtext">
            Pipeline estimate: {formatCurrency(summary.pipelineSpend)}
          </div>
        </div>
      </div>
    </div>
  );
};
