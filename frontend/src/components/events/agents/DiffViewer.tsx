import React from "react";
import { ProposalDiff, MutationItem } from "../../../api/types";
import { CheckCircle2, PlusCircle, Trash2, Edit3, ArrowRight } from "lucide-react";

interface DiffViewerProps {
  diff: ProposalDiff;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  const mutations: MutationItem[] = diff?.mutations || [];

  if (mutations.length === 0) {
    return (
      <div className="diff-empty-state">
        <p>No structured mutations specified in proposal diff.</p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return (
          <span className="diff-badge create">
            <PlusCircle size={13} style={{ marginRight: 4 }} />
            CREATE
          </span>
        );
      case "delete":
        return (
          <span className="diff-badge delete">
            <Trash2 size={13} style={{ marginRight: 4 }} />
            DELETE
          </span>
        );
      case "update":
      default:
        return (
          <span className="diff-badge update">
            <Edit3 size={13} style={{ marginRight: 4 }} />
            UPDATE
          </span>
        );
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "Task":
        return "📋";
      case "BudgetCategory":
      case "BudgetLineItem":
        return "💰";
      case "VendorBooking":
        return "🤝";
      default:
        return "⚙️";
    }
  };

  return (
    <div className="diff-viewer-container" data-testid="diff-viewer">
      <div className="diff-viewer-header">
        <h4 className="diff-title">
          <span>Proposed Operations ({mutations.length})</span>
        </h4>
        <span className="diff-subtitle">Review targeted database mutations before applying</span>
      </div>

      <div className="diff-mutation-list">
        {mutations.map((mutation, index) => (
          <div key={`${mutation.entity_type}-${mutation.entity_id || index}`} className="diff-mutation-card">
            <div className="diff-card-header">
              <div className="diff-entity-meta">
                <span className="diff-entity-icon">{getEntityIcon(mutation.entity_type)}</span>
                <span className="diff-entity-type">{mutation.entity_type}</span>
                {mutation.entity_id && (
                  <span className="diff-entity-id" title={`ID: ${mutation.entity_id}`}>
                    #{mutation.entity_id.slice(0, 8)}...
                  </span>
                )}
              </div>
              <div className="diff-action-wrapper">{getActionBadge(mutation.action)}</div>
            </div>

            <div className="diff-fields-table">
              {Object.entries(mutation.fields || {}).map(([key, val]) => (
                <div key={key} className="diff-field-row">
                  <div className="diff-field-name">{key}</div>
                  <div className="diff-field-transition">
                    <ArrowRight size={13} className="diff-arrow" />
                    <span className="diff-value-new">
                      <CheckCircle2 size={12} style={{ marginRight: 4, display: "inline" }} />
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
