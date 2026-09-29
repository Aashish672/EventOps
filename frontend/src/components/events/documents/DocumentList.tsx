import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar,
} from "lucide-react";
import { Document } from "../../../api/types";
import { detectDocumentType, DocumentCategory } from "./documentUtils";

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onAddDocument: () => void;
  onEditDocument: (doc: Document) => void;
  onDeleteDocument: (doc: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onAddDocument,
  onEditDocument,
  onDeleteDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase().trim();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.file_url.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const renderCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case "pdf":
        return <FileText size={18} />;
      case "sheet":
        return <FileSpreadsheet size={18} />;
      case "image":
        return <ImageIcon size={18} />;
      case "doc":
        return <FileText size={18} />;
      case "link":
      default:
        return <LinkIcon size={18} />;
    }
  };

  if (isLoading) {
    return (
      <div className="documents-tab-container">
        <div className="documents-card" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading event documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-tab-container">
      {/* Search and Action Bar */}
      <div className="documents-controls-bar">
        <div className="documents-search-wrap">
          <Search size={15} className="documents-search-icon" />
          <input
            type="text"
            className="documents-search-input"
            placeholder="Search documents by title or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddDocument}
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Attach Document
        </button>
      </div>

      {/* Main Content Area */}
      {documents.length === 0 ? (
        <div className="documents-empty-state">
          <div className="documents-empty-icon">
            <FileText size={24} />
          </div>
          <h3 className="documents-empty-title">No documents attached yet</h3>
          <p className="documents-empty-desc">
            Keep all event contracts, floor plans, caterer menus, and run-of-show sheets organized in one place.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddDocument}
          >
            <Plus size={14} style={{ marginRight: 6 }} />
            Attach First Document
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="documents-empty-state">
          <div className="documents-empty-icon">
            <Search size={24} />
          </div>
          <h3 className="documents-empty-title">No matching documents</h3>
          <p className="documents-empty-desc">
            No documents matched &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="documents-card">
          <table className="documents-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Document</th>
                <th style={{ width: "15%" }}>Type</th>
                <th style={{ width: "25%" }}>Date Added</th>
                <th style={{ width: "15%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => {
                const typeInfo = detectDocumentType(doc.file_url, doc.title);
                const formattedDate = doc.created_at
                  ? new Date(doc.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—";

                return (
                  <tr key={doc.id} data-testid={`document-row-${doc.id}`}>
                    {/* Document Title & URL */}
                    <td>
                      <div className="doc-title-cell">
                        <div className={`doc-icon-wrap ${typeInfo.iconClass}`}>
                          {renderCategoryIcon(typeInfo.category)}
                        </div>
                        <div className="doc-name-group">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doc-title-text"
                            title={doc.title}
                          >
                            {doc.title}
                          </a>
                          <span className="doc-url-subtext" title={doc.file_url}>
                            {doc.file_url}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* File Type Badge */}
                    <td>
                      <span className={`doc-badge ${typeInfo.badgeClass}`}>
                        {typeInfo.label}
                      </span>
                    </td>

                    {/* Added Date */}
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        <Calendar size={13} />
                        {formattedDate}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td>
                      <div className="doc-actions-cell">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-action-btn"
                          title="Open document in new tab"
                          aria-label={`Open ${doc.title}`}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          className="doc-action-btn"
                          onClick={() => onEditDocument(doc)}
                          title="Edit document"
                          aria-label={`Edit ${doc.title}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="doc-action-btn delete-btn"
                          onClick={() => onDeleteDocument(doc)}
                          title="Delete document"
                          aria-label={`Delete ${doc.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
