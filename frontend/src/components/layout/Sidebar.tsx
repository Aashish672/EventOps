import { Calendar, Settings, Users } from "lucide-react";

export interface SidebarProps {
  currentTab: "members" | "general";
  onTabChange: (tab: "members" | "general") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <div className="sidebar-section-title">Operations</div>
        <div className="sidebar-item disabled" title="Event management arriving in Sprint 3">
          <div className="sidebar-item-left">
            <Calendar size={16} />
            <span>Events</span>
          </div>
          <span className="soon-pill">Sprint 3</span>
        </div>

        <div className="sidebar-section-title" style={{ marginTop: "0.75rem" }}>
          Organization
        </div>
        <button
          type="button"
          className={`sidebar-item ${currentTab === "members" ? "active" : ""}`}
          onClick={() => onTabChange("members")}
        >
          <div className="sidebar-item-left">
            <Users size={16} />
            <span>Team & Members</span>
          </div>
        </button>

        <button
          type="button"
          className={`sidebar-item ${currentTab === "general" ? "active" : ""}`}
          onClick={() => onTabChange("general")}
        >
          <div className="sidebar-item-left">
            <Settings size={16} />
            <span>General Settings</span>
          </div>
        </button>
      </div>

      <div className="sidebar-footer">
        <div>EventOps v0.1.0</div>
        <div style={{ marginTop: "0.2rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
          Multi-Tenant Isolation
        </div>
      </div>
    </aside>
  );
};
