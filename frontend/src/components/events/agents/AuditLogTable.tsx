import React, { useState, useMemo } from "react";
import { ChangeLogEntry } from "../../../api/types";
import { User, Bot, History, ArrowRight } from "lucide-react";

interface AuditLogTableProps {
  entries: ChangeLogEntry[];
  isLoading: boolean;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ entries, isLoading }) => {
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchActor = actorFilter === "all" || entry.actor_type === actorFilter;
      const matchEntity =
        entityFilter === "all" || entry.entity_type.toLowerCase() === entityFilter.toLowerCase();
      return matchActor && matchEntity;
    });
  }, [entries, actorFilter, entityFilter]);

  if (isLoading) {
    return (
      <div className="audit-loading-placeholder placeholder-pulse">
        <div style={{ height: 48, marginBottom: "1rem", borderRadius: 6, background: "var(--bg-subtle)" }} />
        <div style={{ height: 180, borderRadius: 6, background: "var(--bg-subtle)" }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="audit-empty-state">
        <History size={36} className="empty-icon" />
        <h4>No Audit Entries Yet</h4>
        <p>Changes applied to tasks, budget line items, or vendor contracts will be permanently recorded here.</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="audit-log-container" data-testid="audit-log-table">
      {/* Filters Toolbar */}
      <div className="audit-filters-bar">
        <div className="filter-group">
          <label htmlFor="filter-actor" className="filter-label">Actor:</label>
          <select
            id="filter-actor"
            className="filter-select"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
          >
            <option value="all">All Actors</option>
            <option value="agent">AI Agents Only</option>
            <option value="user">Human Planners Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-entity" className="filter-label">Entity:</label>
          <select
            id="filter-entity"
            className="filter-select"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            <option value="all">All Entities</option>
            <option value="task">Tasks</option>
            <option value="budget_item">Budget Items</option>
            <option value="vendor_booking">Vendor Bookings</option>
          </select>
        </div>

        <div className="filter-count">
          Showing {filteredEntries.length} of {entries.length} changes
        </div>
      </div>

      {/* Audit Table */}
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Target Entity</th>
              <th>Modifications (Before ➔ After)</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isAgent = entry.actor_type === "agent";

              return (
                <React.Fragment key={entry.id}>
                  <tr className="audit-row" onClick={() => toggleExpand(entry.id)} style={{ cursor: "pointer" }}>
                    <td className="audit-time">
                      {new Date(entry.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className={`actor-badge ${isAgent ? "badge-agent" : "badge-user"}`}>
                        {isAgent ? <Bot size={13} style={{ marginRight: 4 }} /> : <User size={13} style={{ marginRight: 4 }} />}
                        {isAgent ? "AI Agent" : `User (${entry.actor_id})`}
                      </span>
                    </td>
                    <td>
                      <span className="entity-badge">{entry.entity_type}</span>
                      <span className="entity-id-sub">#{entry.entity_id.slice(0, 8)}</span>
                    </td>
                    <td className="audit-quick-diff">
                      <div className="quick-diff-preview">
                        {Object.keys(entry.after || {}).slice(0, 2).map((key) => (
                          <span key={key} className="diff-pill">
                            <span className="key-name">{key}:</span>
                            <span className="old-val">{String(entry.before?.[key] ?? "none")}</span>
                            <ArrowRight size={10} style={{ margin: "0 2px" }} />
                            <span className="new-val">{String(entry.after[key])}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-toggle-diff"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(entry.id);
                        }}
                      >
                        {isExpanded ? "Hide" : "Inspect"}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="audit-expanded-row">
                      <td colSpan={5}>
                        <div className="audit-expanded-content">
                          <div className="expanded-side before-side">
                            <h5>Pre-Mutation State (Before)</h5>
                            <pre>{JSON.stringify(entry.before, null, 2)}</pre>
                          </div>
                          <div className="expanded-side after-side">
                            <h5>Post-Mutation State (After)</h5>
                            <pre>{JSON.stringify(entry.after, null, 2)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
