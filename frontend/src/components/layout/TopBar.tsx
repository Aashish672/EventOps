import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { useOrganization } from "../../context/useOrganization";
import { fetchHealthCheck } from "../../api/client";
import { supabase } from '../../lib/supabase';
export const TopBar: React.FC = () => {
  const {
    organizations,
    activeOrg,
    setActiveOrg,
    openCreateModal,
    currentUserRole,
    isUnauthenticated,
  } = useOrganization();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [healthStatus, setHealthStatus] = useState<"healthy" | "degraded" | "error">("healthy");
  const [healthMessage, setHealthMessage] = useState<string>("Checking connectivity...");

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await fetchHealthCheck();
        if (isMounted) {
          if (res.status === "healthy") {
            setHealthStatus("healthy");
            setHealthMessage("API Operational (DB & Cache Connected)");
          } else {
            setHealthStatus("degraded");
            setHealthMessage("API Degraded");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setHealthStatus("error");
          setHealthMessage(err instanceof Error ? err.message : "API Unreachable");
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="brand-block">
          <div className="brand-icon">EO</div>
          <span className="brand-name">EventOps</span>
        </div>

        <div className="top-bar-divider" />

        {/* Organization Switcher Dropdown */}
        <div className="org-select-container" ref={dropdownRef}>
          <button
            id="org-switcher-button"
            className="org-select-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <Building2 size={15} color="var(--text-secondary)" />
            <span>{activeOrg ? activeOrg.name : "Select Organization"}</span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {dropdownOpen && (
            <div className="org-dropdown">
              <div className="org-dropdown-label">Organizations ({organizations.length})</div>
              <div className="org-dropdown-list">
                {organizations.map((org) => {
                  const isSelected = activeOrg?.id === org.id;
                  return (
                    <button
                      key={org.id}
                      className={`org-dropdown-item ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setActiveOrg(org);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{org.name}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
              <div className="org-dropdown-divider" />
              <button
                id="create-org-btn"
                className="create-org-action-btn"
                onClick={() => {
                  setDropdownOpen(false);
                  openCreateModal();
                }}
              >
                <Plus size={14} />
                <span>Create Organization</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="top-bar-right">
        {/* Health status badge */}
        <div
          className={`health-status-badge ${healthStatus}`}
          title={healthMessage}
        >
          <span className="health-status-dot" />
          <span>
            {healthStatus === "healthy"
              ? "System Healthy"
              : healthStatus === "degraded"
                ? "System Degraded"
                : "Backend Offline"}
          </span>
        </div>

        {isUnauthenticated && (
          <div className="health-status-badge error" title="No active authentication session">
            <span>Unauthenticated</span>
          </div>
        )}

        <div className="top-bar-divider" />

        {/* User profile */}
        <div className="user-profile-block">
          <div className="user-avatar-circle" title="Active user">
            AV
          </div>
          <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
            Alice Vance
          </span>
          <span className={`badge-role role-${currentUserRole.toLowerCase()}`}>
            {currentUserRole.toUpperCase()}
          </span>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="btn btn-secondary" 
            style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};
