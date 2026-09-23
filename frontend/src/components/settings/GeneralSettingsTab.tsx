import React, { useState } from "react";
import { Copy, Check, Building2, Calendar, ShieldCheck } from "lucide-react";
import { useOrganization } from "../../context/useOrganization";

export const GeneralSettingsTab: React.FC = () => {
  const { activeOrg } = useOrganization();
  const [copied, setCopied] = useState(false);

  if (!activeOrg) {
    return (
      <div className="card-surface card-body">
        <div className="state-empty">
          <Building2 size={32} color="var(--text-muted)" />
          <div className="state-empty-title">No Organization Selected</div>
          <div className="state-empty-desc">
            Select or create an organization to view its general settings and tenant identifiers.
          </div>
        </div>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(activeOrg.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-surface">
      <div className="card-header">
        <div>
          <h2 className="card-title">General Information</h2>
          <p className="card-subtitle">
            Core tenant identifiers and metadata governing this workspace.
          </p>
        </div>
      </div>

      <div className="card-body">
        <div className="definition-grid">
          <div className="definition-item">
            <span className="definition-label">Organization Name</span>
            <span className="definition-value">{activeOrg.name}</span>
          </div>

          <div className="definition-item">
            <span className="definition-label">URL Slug</span>
            <div className="definition-code-block">
              <span className="code-pill">/{activeOrg.slug}</span>
            </div>
          </div>

          <div className="definition-item">
            <span className="definition-label">Tenant ID (UUID)</span>
            <div className="definition-code-block">
              <span className="code-pill">{activeOrg.id}</span>
              <button
                type="button"
                className="btn-copy"
                onClick={handleCopyId}
                title="Copy Tenant UUID"
              >
                {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="definition-item">
            <span className="definition-label">Subscription Tier</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge-role role-planner">FREE TIER</span>
              <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                (Self-hosted / $0 infrastructure)
              </span>
            </div>
          </div>

          <div className="definition-item">
            <span className="definition-label">Created Date</span>
            <span className="definition-value" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Calendar size={14} color="var(--text-muted)" />
              {new Date(activeOrg.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="definition-item">
            <span className="definition-label">Tenant Isolation Guarantee</span>
            <span className="definition-value" style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--success)" }}>
              <ShieldCheck size={16} />
              Row-Level Isolation Keyed to Org ID
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
