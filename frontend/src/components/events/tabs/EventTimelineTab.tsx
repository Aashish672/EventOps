import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Kanban,
  List,
  Search,
  CheckSquare,
  Filter,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useOrganization } from "../../../context/useOrganization";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "../../../hooks/useTasks";
import { Task } from "../../../api/types";
import { TaskKanbanBoard } from "../tasks/TaskKanbanBoard";
import { TaskListView } from "../tasks/TaskListView";
import { TaskModal } from "../tasks/TaskModal";
import { DeleteTaskModal } from "../tasks/DeleteTaskModal";
import { RiskAssessmentModal } from "../tasks/RiskAssessmentModal";
import "../agents/agents.css";

export const EventTimelineTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const navigate = useNavigate();
  const { members } = useOrganization();

  // Tasks Query & Mutations
  const { data: tasks = [], isLoading } = useTasks(eventId);
  const createTaskMutation = useCreateTask(eventId);
  const updateTaskMutation = useUpdateTask(eventId);
  const deleteTaskMutation = useDeleteTask(eventId);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Task["status"]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<Task["status"]>("todo");
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskAssessmentToast, setRiskAssessmentToast] = useState<{ runId: string; summary: string } | null>(null);

  // Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter === "unassigned") {
        if (task.assigned_to !== null) return false;
      } else if (assigneeFilter !== "all") {
        if (task.assigned_to !== parseInt(assigneeFilter, 10)) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, assigneeFilter]);

  // Handlers
  const handleOpenCreateModal = (status: Task["status"] = "todo") => {
    setEditingTask(null);
    setDefaultColumnStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleStatusChange = async (task: Task, newStatus: Task["status"]) => {
    if (task.status === newStatus) return;
    try {
      setUpdatingTaskId(task.id);
      await updateTaskMutation.mutateAsync({
        id: task.id,
        payload: { status: newStatus },
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleTaskSubmit = async (data: Partial<Task>) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({
        id: editingTask.id,
        payload: data,
      });
    } else {
      await createTaskMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleDeleteConfirm = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAssigneeFilter("all");
  };

  return (
    <div className="event-tab-pane">
      {/* Top Banner & Progress Header */}
      <div className="timeline-header-panel">
        <div>
          <h2 className="tab-pane-title">Timeline & Tasks</h2>
          <p className="tab-pane-description">
            Organize event schedules, milestone deadlines, and planner task assignments for {event?.name}.
          </p>
        </div>

        {/* Progress Summary Pill */}
        <div className="timeline-progress-pill">
          <div className="progress-info">
            <span className="progress-label">Task Progress:</span>
            <span className="progress-count">
              {completedTasks} of {totalTasks} done ({progressPercent}%)
            </span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar: Filters, Search, View Switcher & Action CTA */}
      <div className="timeline-toolbar">
        {/* Search Input */}
        <div className="toolbar-search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />
        </div>

        {/* Status Filter */}
        <div className="toolbar-filter-group">
          <Filter size={13} className="filter-icon" />
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | Task["status"])}
            aria-label="Filter tasks by status"
          >
            <option value="all">All Statuses ({totalTasks})</option>
            <option value="todo">To Do ({tasks.filter((t) => t.status === "todo").length})</option>
            <option value="in_progress">In Progress ({inProgressTasks})</option>
            <option value="done">Done ({completedTasks})</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="toolbar-filter-group">
          <select
            className="toolbar-select"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            aria-label="Filter tasks by assignee"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.user_id}>
                {m.username || m.email}
              </option>
            ))}
          </select>
        </div>

        {/* Right side: View Switcher & Add Task Button */}
        <div className="toolbar-right-actions">
          {/* View Mode Toggle Buttons */}
          <div className="view-mode-toggle" role="group" aria-label="Task view mode">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => setViewMode("kanban")}
              title="Kanban Board view"
              aria-label="Kanban Board view"
              aria-pressed={viewMode === "kanban"}
            >
              <Kanban size={14} />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List size={14} />
              <span>List</span>
            </button>
          </div>

          {/* Assess Schedule Risk Button */}
          <button
            type="button"
            className="btn-risk-assessment"
            onClick={() => setIsRiskModalOpen(true)}
            title="Run AI Risk & Change Impact assessment on event timeline"
            id="assess-risk-btn"
            data-testid="assess-risk-btn"
          >
            <ShieldAlert size={14} />
            <span>Assess Schedule Risk</span>
          </button>

          {/* Primary Add Task Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCreateModal("todo")}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Add Task
          </button>
        </div>
      </div>

      {/* Risk Assessment Success Notification */}
      {riskAssessmentToast && (
        <div
          className="risk-success-notification"
          role="status"
          data-testid="risk-assessment-notification"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Sparkles size={16} style={{ color: "#16a34a" }} />
            <span style={{ fontSize: "0.875rem", color: "#166534", fontWeight: 500 }}>
              Risk Assessment generated! A remediation proposal is pending review in the Agent Console.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
              onClick={() => navigate(`/events/${eventId}/agents`)}
              id="view-in-agent-console-btn"
            >
              View in Agent Console
            </button>
            <button
              type="button"
              onClick={() => setRiskAssessmentToast(null)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#166534", padding: "0.2rem" }}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 260, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : tasks.length === 0 ? (
        /* Empty State: No tasks created yet */
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <CheckSquare size={32} color="var(--accent-primary)" />
          </div>
          <h3>No Tasks Yet</h3>
          <p>
            Start organizing your event by creating your first milestone, vendor coordination item, or planning task.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCreateModal("todo")}
            style={{ marginTop: "1rem" }}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Create First Task
          </button>
        </div>
      ) : filteredTasks.length === 0 ? (
        /* No matches for search / filters */
        <div className="event-state-box empty-state">
          <div className="event-state-icon">🔍</div>
          <h3>No Matching Tasks</h3>
          <p>No tasks matched your current search and filter criteria.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearFilters}
            style={{ marginTop: "0.75rem" }}
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <TaskKanbanBoard
          tasks={filteredTasks}
          members={members}
          onEdit={handleOpenEditModal}
          onDelete={(task) => setDeletingTask(task)}
          onStatusChange={handleStatusChange}
          onQuickAdd={handleOpenCreateModal}
          updatingTaskId={updatingTaskId}
        />
      ) : (
        /* List View */
        <TaskListView
          tasks={filteredTasks}
          members={members}
          onEdit={handleOpenEditModal}
          onDelete={(task) => setDeletingTask(task)}
          onStatusChange={handleStatusChange}
          updatingTaskId={updatingTaskId}
        />
      )}

      {/* Create & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
        defaultStatus={defaultColumnStatus}
        members={members}
        isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteTaskModal
        isOpen={Boolean(deletingTask)}
        task={deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteTaskMutation.isPending}
      />

      {/* Risk Assessment Modal */}
      <RiskAssessmentModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        eventId={eventId}
        onSuccess={(run) => {
          setRiskAssessmentToast({
            runId: run.id,
            summary: (run.proposed_diff?.impact_summary as string) || "Proposal ready for review.",
          });
        }}
      />
    </div>
  );
};

