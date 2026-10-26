import React, { useState } from "react";
import { useEventContext } from "../../../context/useEventContext";
import { useOrganization } from "../../../context/useOrganization";
import { useAgentRuns, useChangeLog } from "../../../hooks/useAgents";
import { AgentProposalCard } from "../agents/AgentProposalCard";
import { AuditLogTable } from "../agents/AuditLogTable";
import { Sparkles, ShieldCheck, History, CheckCircle2 } from "lucide-react";
import "../agents/agents.css";

export const EventAgentConsoleTab: React.FC = () => {
  const { eventId } = useEventContext();
  const { currentUserRole } = useOrganization();
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "history" | "all">("pending");
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>("all");

  const { data: runs = [], isLoading: isRunsLoading } = useAgentRuns(eventId);
  const { data: changeLogs = [], isLoading: isLogsLoading } = useChangeLog(eventId);

  const canModerate = currentUserRole === "owner" || currentUserRole === "planner";

  const pendingRuns = runs.filter((r) => r.state === "pending");

  const displayRuns = (activeSubTab === "pending" ? pendingRuns : runs).filter((r) => {
    return agentTypeFilter === "all" || r.agent_type === agentTypeFilter;
  });

  return (
    <div className="agent-console-tab" data-testid="agent-console-tab">
      {/* Console Header */}
      <div className="agent-console-header">
        <div className="console-title-group">
          <h2>
            <Sparkles size={20} style={{ color: "var(--accent-primary, #4f46e5)" }} />
            AI Agent Console & Governance
          </h2>
          <p className="console-subtitle">
            Autonomous multi-agent intelligence operating with strict human-in-the-loop oversight and atomic change logging.
          </p>
        </div>

        {/* Sub-navigation Pills */}
        <div className="console-nav-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "pending"}
            className={`console-pill-btn ${activeSubTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveSubTab("pending")}
            id="tab-pending-proposals"
          >
            <ShieldCheck size={15} />
            <span>Pending Review</span>
            <span className={`pill-counter ${pendingRuns.length === 0 ? "empty" : ""}`}>
              {pendingRuns.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "all"}
            className={`console-pill-btn ${activeSubTab === "all" ? "active" : ""}`}
            onClick={() => setActiveSubTab("all")}
            id="tab-all-proposals"
          >
            <span>All Proposals</span>
            <span className="pill-counter empty">{runs.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "history"}
            className={`console-pill-btn ${activeSubTab === "history" ? "active" : ""}`}
            onClick={() => setActiveSubTab("history")}
            id="tab-audit-log"
          >
            <History size={15} />
            <span>Audit History</span>
            <span className="pill-counter empty">{changeLogs.length}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === "history" ? (
        <AuditLogTable entries={changeLogs} isLoading={isLogsLoading} />
      ) : (
        <div className="proposals-view">
          {/* Filter Toolbar */}
          {runs.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label htmlFor="agent-type-select" style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                  Agent Type:
                </label>
                <select
                  id="agent-type-select"
                  className="filter-select"
                  value={agentTypeFilter}
                  onChange={(e) => setAgentTypeFilter(e.target.value)}
                >
                  <option value="all">All Agents</option>
                  <option value="risk_change_impact">Risk & Change Impact</option>
                  <option value="event_planning">Event Planning</option>
                  <option value="budget_intelligence">Budget Intelligence</option>
                  <option value="document_intelligence">Document Intelligence</option>
                  <option value="vendor_evaluation">Vendor Evaluation</option>
                </select>
              </div>
            </div>
          )}

          {isRunsLoading ? (
            <div className="placeholder-pulse" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ height: 140, borderRadius: 8, background: "var(--bg-subtle)" }} />
              <div style={{ height: 140, borderRadius: 8, background: "var(--bg-subtle)" }} />
            </div>
          ) : displayRuns.length === 0 ? (
            <div className="empty-proposals-state">
              <CheckCircle2 size={40} className="empty-icon" style={{ color: "#10b981" }} />
              <h4>
                {activeSubTab === "pending"
                  ? "No Pending Proposals"
                  : "No Agent Proposals Found"}
              </h4>
              <p>
                {activeSubTab === "pending"
                  ? "All agent proposals have been reviewed. Event operations are in sync."
                  : "Triggered agent analyses will show up here for review before applying."}
              </p>
            </div>
          ) : (
            <div className="proposals-list">
              {displayRuns.map((run) => (
                <AgentProposalCard
                  key={run.id}
                  proposal={run}
                  eventId={eventId}
                  canModerate={canModerate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
