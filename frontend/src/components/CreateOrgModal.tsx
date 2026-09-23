import React, { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { useOrganization } from "../context/useOrganization";

export const CreateOrgModal: React.FC = () => {
  const { isCreateModalOpen, closeCreateModal, createOrg } = useOrganization();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateModalOpen) {
      setName("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCreateModalOpen && !loading) {
        closeCreateModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, loading, closeCreateModal]);

  if (!isCreateModalOpen) return null;

  const slugPreview = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Organization name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createOrg(name.trim());
      closeCreateModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && closeCreateModal()}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-org-title"
      >
        <div className="modal-header-bar">
          <h3 id="create-org-title" className="modal-title-text">
            Create Organization
          </h3>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={closeCreateModal}
            disabled={loading}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-area">
            <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Establish a new tenant workspace to isolate event operations, budgets, and teams.
            </p>

            <div className="form-field">
              <label htmlFor="create-org-name-input" className="form-label-text">
                Organization Name
              </label>
              <input
                ref={inputRef}
                id="create-org-name-input"
                type="text"
                className="input-text"
                placeholder="e.g. Apex Live Experiences"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                maxLength={100}
                required
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>Slug:</span>
                <code className="code-pill">/orgs/{slugPreview || "slug"}</code>
              </div>
            </div>

            {error && (
              <div className="alert-banner error" role="alert">
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer-bar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeCreateModal}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="submit-create-org-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading && <Loader2 size={14} className="spin-icon" />}
              <span>{loading ? "Creating..." : "Create Organization"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
