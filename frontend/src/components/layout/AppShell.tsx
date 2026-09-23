import React from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { ChevronRight } from "lucide-react";
import { useOrganization } from "../../context/useOrganization";

export interface AppShellProps {
  currentTab: "members" | "general";
  onTabChange: (tab: "members" | "general") => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { activeOrg } = useOrganization();

  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar currentTab={currentTab} onTabChange={onTabChange} />
        <main className="main-content">
          {/* Breadcrumb Row */}
          <nav className="breadcrumb-row" aria-label="Breadcrumb">
            <span>Organizations</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span>{activeOrg ? activeOrg.name : "None"}</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span className="breadcrumb-current">
              {currentTab === "members" ? "Team & Members" : "General Settings"}
            </span>
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
};
