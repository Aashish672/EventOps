import React from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "../../context/useOrganization";

export interface AppShellProps {
  currentTab?: "events" | "members" | "general";
  onTabChange?: (tab: "events" | "members" | "general") => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab: propCurrentTab,
  onTabChange: propOnTabChange,
  children,
}) => {
  const { activeOrg } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive tab from pathname if not explicitly provided
  const currentTab =
    propCurrentTab ||
    (location.pathname.startsWith("/settings/members")
      ? "members"
      : location.pathname.startsWith("/settings/general")
      ? "general"
      : "events");

  const handleTabChange = (tab: "events" | "members" | "general") => {
    if (propOnTabChange) {
      propOnTabChange(tab);
    }
    if (tab === "events") {
      navigate("/events");
    } else if (tab === "members") {
      navigate("/settings/members");
    } else if (tab === "general") {
      navigate("/settings/general");
    }
  };

  const isEventDetail =
    location.pathname.startsWith("/events/") && location.pathname !== "/events";

  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />
        <main className="main-content">
          {/* Breadcrumb Row */}
          <nav className="breadcrumb-row" aria-label="Breadcrumb">
            <span>Organizations</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span>{activeOrg ? activeOrg.name : "None"}</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            {isEventDetail ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/events")}
                  className="breadcrumb-link"
                >
                  Events
                </button>
                <ChevronRight size={12} color="var(--text-muted)" />
                <span className="breadcrumb-current">Workspace</span>
              </>
            ) : (
              <span className="breadcrumb-current">
                {currentTab === "events"
                  ? "Events"
                  : currentTab === "members"
                  ? "Team & Members"
                  : "General Settings"}
              </span>
            )}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
};
