import React, { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { Users, Settings, CreditCard } from "lucide-react";
import { OrganizationProvider } from "./context/OrganizationProvider";
import { useOrganization } from "./context/useOrganization";
import { AppShell } from "./components/layout/AppShell";
import { MembersTab } from "./components/settings/MembersTab";
import { GeneralSettingsTab } from "./components/settings/GeneralSettingsTab";
import { CreateOrgModal } from "./components/CreateOrgModal";
import { EventsDashboard } from "./components/events/EventsDashboard";
import { EventDetailPlaceholder } from "./components/events/EventDetailPlaceholder";
import { supabase } from "./lib/supabase";
import { AuthScreen } from "./components/AuthScreen";

const queryClient = new QueryClient();

interface SettingsViewProps {
  tab: "members" | "general";
}

const SettingsView: React.FC<SettingsViewProps> = ({ tab }) => {
  const { activeOrg, members } = useOrganization();
  const navigate = useNavigate();

  return (
    <>
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
          aria-selected={tab === "members"}
          className={`tab-btn ${tab === "members" ? "active" : ""}`}
          onClick={() => navigate("/settings/members")}
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
          aria-selected={tab === "general"}
          className={`tab-btn ${tab === "general" ? "active" : ""}`}
          onClick={() => navigate("/settings/general")}
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
      {tab === "members" ? <MembersTab /> : <GeneralSettingsTab />}
    </>
  );
};

const AppContent: React.FC = () => {
  return (
    <AppShell>
      <CreateOrgModal />
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventsDashboard />} />
        <Route path="/events/:eventId" element={<EventDetailPlaceholder />} />
        <Route path="/settings/members" element={<SettingsView tab="members" />} />
        <Route path="/settings/general" element={<SettingsView tab="general" />} />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </AppShell>
  );
};

export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if the user is already logged in when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for login/logout events and update the UI instantly!
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a blank screen or spinner while checking the session
  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading...
      </div>
    );
  }

  // If they aren't logged in, show our Auth Screen
  if (!session) {
    return <AuthScreen />;
  }

  // If they are logged in, show the application with React Router and React Query
  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </OrganizationProvider>
    </QueryClientProvider>
  );
};
