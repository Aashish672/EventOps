import React from "react";
import { CheckSquare, Plus, Clock } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import { useTasks } from "../../../hooks/useTasks";

export const EventTimelineTab: React.FC = () => {
  const { eventId, event } = useEventContext();
  const { data: tasks = [], isLoading } = useTasks(eventId);

  return (
    <div className="event-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Timeline & Tasks</h2>
          <p className="tab-pane-description">
            Organize milestones, coordinate action items, and track task progress for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          title="Create task functionality arriving in Epic 3.3"
          disabled
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Task
          <span className="soon-pill" style={{ marginLeft: 6 }}>Epic 3.3</span>
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : tasks.length === 0 ? (
        <div className="event-state-box empty-state">
          <div className="event-state-icon">
            <CheckSquare size={28} color="var(--accent-primary)" />
          </div>
          <h3>No Tasks Configured</h3>
          <p>
            The task list and Kanban board workflow will be enabled in <strong>Epic 3.3</strong>.
          </p>
          <div className="epic-badge-note">
            <Clock size={13} style={{ marginRight: 4 }} />
            Ready for Epic 3.3: Timeline & Task Management UI
          </div>
        </div>
      ) : (
        <div className="task-preview-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-preview-item">
              <span className={`task-status-pill status-${task.status}`}>
                {task.status.replace("_", " ").toUpperCase()}
              </span>
              <span className="task-title">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
