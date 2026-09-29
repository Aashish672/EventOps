import React, { useState, useEffect } from "react";
import { X, FileText, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Document } from "../../../api/types";
import { detectDocumentType, isValidUrl } from "./documentUtils";

export interface DocumentFormData {
  title: string;
  file_url: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentFormData) => Promise<void>;
  initialDocument?: Document | null;
  isSubmitting?: boolean;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDocument,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialDocument);

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialDocument) {
      setTitle(initialDocument.title || "");
      setFileUrl(initialDocument.file_url || "");
    } else {
      setTitle("");
      setFileUrl("");
    }
    setError(null);
  }, [initialDocument, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Document title is required.");
      return;
    }

    const trimmedUrl = fileUrl.trim();
    if (!trimmedUrl) {
      setError("File URL is required.");
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    try {
      await onSubmit({
        title: trimmedTitle,
        file_url: trimmedUrl,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save document.";
      setError(message);
    }
  };

  const detected = fileUrl.trim() ? detectDocumentType(fileUrl, title) : null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
    >
      <div
        className="modal-container"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="var(--accent-primary)" />
            <h3 id="document-modal-title" className="modal-title">
              {isEditing ? "Edit Document" : "Attach Document"}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form noValidate onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.625rem 0.75rem",
                  color: "#ef4444",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Document Title */}
            <div className="form-group">
              <label htmlFor="document-title-input" className="form-label">
                Document Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="document-title-input"
                type="text"
                className="form-input"
                placeholder="e.g. Master Catering Contract, Seating Layout v2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* File URL */}
            <div className="form-group">
              <label htmlFor="document-url-input" className="form-label">
                File / Document Link (URL) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="document-url-input"
                  type="url"
                  className="form-input"
                  placeholder="https://storage.googleapis.com/... or https://drive.google.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  disabled={isSubmitting}
                  style={{ paddingLeft: "2.25rem" }}
                />
                <LinkIcon
                  size={15}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                Direct link to cloud storage, Google Drive, Dropbox, or public file URL.
              </span>
            </div>

            {/* File Type Detection Preview */}
            {detected && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8125rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`doc-badge ${detected.badgeClass}`}>
                    {detected.label}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Detected format
                  </span>
                </div>
                {isValidUrl(fileUrl) && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--accent-primary)",
                      fontSize: "0.75rem",
                      textDecoration: "none",
                    }}
                  >
                    Test link <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin-icon" style={{ marginRight: 6 }} />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Attach Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
