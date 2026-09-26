import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  DollarSign,
  Users,
  Store,
  ArrowRight,
  Calendar,
  FileText,
  Clock,
} from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useTasks } from "../../../hooks/useTasks";
import { useBudgetCategories } from "../../../hooks/useBudgets";
import { useHouseholds } from "../../../hooks/useGuests";
import { useVendorBookings } from "../../../hooks/useVendors";

export const EventOverviewTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const navigate = useNavigate();

  // Queries for live metrics
  const { data: tasks = [] } = useTasks(eventId);
  const { data: budgetCategories = [] } = useBudgetCategories(eventId);
  const { data: households = [] } = useHouseholds(eventId);
  const { data: vendorBookings = [] } = useVendorBookings(eventId);

  if (!event) return null;

  // Task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Budget calculations
  const totalAllocated = budgetCategories.reduce(
    (sum, cat) => sum + (parseFloat(cat.allocated_amount) || 0),
    0
  );
  let totalEstimated = 0;
  let totalActual = 0;
  for (const cat of budgetCategories) {
    if (cat.line_items) {
      for (const item of cat.line_items) {
        totalEstimated += parseFloat(item.estimated_cost) || 0;
        totalActual += parseFloat(item.actual_cost) || 0;
      }
    }
  }

  // Vendor statistics
  const confirmedVendors = vendorBookings.filter((b) => b.status === "booked").length;

  return (
    <div className="event-overview-container">
      {/* KPI Cards Grid */}
      <div className="event-metrics-grid">
        {/* Task Metric */}
        <div
          className="event-metric-card"
          onClick={() => navigate(`/events/${eventId}/timeline`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate(`/events/${eventId}/timeline`)}
        >
          <div className="event-metric-header">
            <span className="event-metric-title">Timeline & Tasks</span>
            <div className="event-metric-icon-wrap task-icon">
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="event-metric-value">{completedTasks} / {totalTasks}</div>
          <div className="event-metric-subtext">
            {totalTasks === 0 ? "No tasks created yet" : `${taskProgress}% completed (${inProgressTasks} in progress)`}
          </div>
          <div className="event-metric-footer">
            <span>Manage Tasks</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Budget Metric */}
        <div
          className="event-metric-card"
          onClick={() => navigate(`/events/${eventId}/budget`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate(`/events/${eventId}/budget`)}
        >
          <div className="event-metric-header">
            <span className="event-metric-title">Budget Tracker</span>
            <div className="event-metric-icon-wrap budget-icon">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="event-metric-value">${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="event-metric-subtext">
            ${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent (${totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })} estimated)
          </div>
          <div className="event-metric-footer">
            <span>Track Budget</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Guest Metric */}
        <div
          className="event-metric-card"
          onClick={() => navigate(`/events/${eventId}/guests`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate(`/events/${eventId}/guests`)}
        >
          <div className="event-metric-header">
            <span className="event-metric-title">Guests</span>
            <div className="event-metric-icon-wrap guest-icon">
              <Users size={16} />
            </div>
          </div>
          <div className="event-metric-value">{households.length}</div>
          <div className="event-metric-subtext">
            {households.length === 1 ? "1 household registered" : `${households.length} households registered`}
          </div>
          <div className="event-metric-footer">
            <span>View Guest List</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Vendor Metric */}
        <div
          className="event-metric-card"
          onClick={() => navigate(`/events/${eventId}/vendors`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate(`/events/${eventId}/vendors`)}
        >
          <div className="event-metric-header">
            <span className="event-metric-title">Vendors</span>
            <div className="event-metric-icon-wrap vendor-icon">
              <Store size={16} />
            </div>
          </div>
          <div className="event-metric-value">{vendorBookings.length}</div>
          <div className="event-metric-subtext">
            {confirmedVendors} confirmed · {vendorBookings.length - confirmedVendors} in inquiry
          </div>
          <div className="event-metric-footer">
            <span>Coordinate Vendors</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="event-details-card">
        <h3 className="section-title">
          <FileText size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
          Event Information
        </h3>
        <div className="event-details-grid">
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className={`event-status-badge status-${event.status}`}>
              {event.status.toUpperCase()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Start Date</span>
            <span className="detail-value">
              <Calendar size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              {new Date(event.start_date).toLocaleString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">End Date</span>
            <span className="detail-value">
              <Clock size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
              {new Date(event.end_date).toLocaleString()}
            </span>
          </div>
          <div className="detail-item full-width">
            <span className="detail-label">Description</span>
            <p className="detail-value-text">
              {event.description || "No description provided for this event."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
