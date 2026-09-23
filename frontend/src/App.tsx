import React, { useState } from "react";
import { Users, Settings, CreditCard } from "lucide-react";
import { OrganizationProvider } from "./context/OrganizationProvider";
import { useOrganization } from "./context/useOrganization";
import { AppShell } from "./components/layout/AppShell";
import { MembersTab } from "./components/settings/MembersTab";
import { GeneralSettingsTab } from "./components/settings/GeneralSettingsTab";
import { CreateOrgModal } from "./components/CreateOrgModal";

const AppContent: React.FC = () => {
  const { activeOrg, members } = useOrganization();
  const [currentTab, setCurrentTab] = useState<"members" | "general">("members");

  return (
    <AppShell currentTab={currentTab} onTabChange={setCurrentTab}>
      <CreateOrgModal />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {activeOrg ? activeOrg.name : "Organization Settings"}
          </h1>
          <p className="page-description">
            Manage team access, role-based permissions, and workspace configuration.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="settings-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "members"}
          className={`tab-btn ${currentTab === "members" ? "active" : ""}`}
          onClick={() => setCurrentTab("members")}
        >
          <Users size={15} />
          <span>Members</span>
          {activeOrg && (
            <span className="tab-count-badge">{members.length}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "general"}
          className={`tab-btn ${currentTab === "general" ? "active" : ""}`}
          onClick={() => setCurrentTab("general")}
        >
          <Settings size={15} />
          <span>General</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="tab-btn disabled"
          title="Billing integration arriving in Sprint 4 (Stripe)"
          disabled
        >
          <CreditCard size={15} />
          <span>Billing</span>
          <span className="soon-pill" style={{ marginLeft: "0.25rem" }}>Sprint 4</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === "members" ? <MembersTab /> : <GeneralSettingsTab />}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <OrganizationProvider>
      <AppContent />
    </OrganizationProvider>
  );
};
