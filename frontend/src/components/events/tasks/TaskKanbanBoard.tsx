import React from "react";
import { Plus, CircleDashed, Clock, CheckCircle2 } from "lucide-react";
import { Task } from "../../../api/types";
import { Membership } from "../../../api/organizations";
import { TaskCard } from "./TaskCard";

export interface TaskKanbanBoardProps {
  tasks: Task[];
  members: Membership[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: Task["status"]) => void;
  onQuickAdd: (status: Task["status"]) => void;
  updatingTaskId?: string | null;
}

interface ColumnConfig {
  id: Task["status"];
  label: string;
  icon: React.ReactNode;
  headerClass: string;
  emptyText: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "todo",
    label: "To Do",
    icon: <CircleDashed size={15} />,
    headerClass: "column-header-todo",
    emptyText: "No tasks to do",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: <Clock size={15} />,
    headerClass: "column-header-in-progress",
    emptyText: "No tasks currently in progress",
  },
  {
    id: "done",
    label: "Done",
    icon: <CheckCircle2 size={15} />,
    headerClass: "column-header-done",
    emptyText: "No completed tasks yet",
  },
];

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  members,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickAdd,
  updatingTaskId,
}) => {
  return (
    <div className="kanban-board-container" role="region" aria-label="Tasks Kanban Board">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div key={col.id} className="kanban-column">
            {/* Column Header */}
            <div className={`kanban-column-header ${col.headerClass}`}>
              <div className="column-title-wrap">
                {col.icon}
                <h3 className="column-title">{col.label}</h3>
                <span className="column-count-badge">{columnTasks.length}</span>
              </div>
              <button
                type="button"
                className="column-add-btn"
                onClick={() => onQuickAdd(col.id)}
                aria-label={`Add task to ${col.label}`}
                title={`Add task to ${col.label}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Column Body / Cards List */}
            <div className="kanban-column-body">
              {columnTasks.length === 0 ? (
                <div className="kanban-empty-column">
                  <p>{col.emptyText}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onQuickAdd(col.id)}
                  >
                    <Plus size={12} style={{ marginRight: 4 }} />
                    Add task
                  </button>
                </div>
              ) : (
                <div className="kanban-cards-stack">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      isUpdating={updatingTaskId === task.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
