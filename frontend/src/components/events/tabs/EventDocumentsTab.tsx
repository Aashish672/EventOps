import React, { useState } from "react";
import { FileText, Sparkles, X } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "../../../hooks/useDocuments";
import { Document } from "../../../api/types";
import { DocumentList } from "../documents/DocumentList";
import { DocumentModal, DocumentFormData } from "../documents/DocumentModal";
import { DeleteDocumentModal } from "../documents/DeleteDocumentModal";
import { AnalyzeDocumentModal } from "../documents/AnalyzeDocumentModal";
import "../documents/documents.css";

interface EventDocumentsTabProps {
  onAddDocument?: () => void;
  onEditDocument?: (doc: Document) => void;
  onDeleteDocument?: (doc: Document) => void;
  onAnalyzeDocument?: (doc: Document) => void;
}

export const EventDocumentsTab: React.FC<EventDocumentsTabProps> = ({
  onAddDocument: propOnAddDocument,
  onEditDocument: propOnEditDocument,
  onDeleteDocument: propOnDeleteDocument,
  onAnalyzeDocument: propOnAnalyzeDocument,
}) => {
  const { eventId } = useEventContext();
  const { data: documents = [], isLoading } = useDocuments(eventId);

  const createMutation = useCreateDocument(eventId);
  const updateMutation = useUpdateDocument(eventId);
  const deleteMutation = useDeleteDocument(eventId);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [analyzingDoc, setAnalyzingDoc] = useState<Document | null>(null);
  const [documentToast, setDocumentToast] = useState<{ runId: string; summary: string } | null>(null);

  const handleOpenAdd = () => {
    if (propOnAddDocument) {
      propOnAddDocument();
    } else {
      setEditingDoc(null);
      setIsModalOpen(true);
    }
  };

  const handleOpenEdit = (doc: Document) => {
    if (propOnEditDocument) {
      propOnEditDocument(doc);
    } else {
      setEditingDoc(doc);
      setIsModalOpen(true);
    }
  };

  const handleOpenDelete = (doc: Document) => {
    if (propOnDeleteDocument) {
      propOnDeleteDocument(doc);
    } else {
      setDeletingDoc(doc);
      setIsDeleteModalOpen(true);
    }
  };

  const handleOpenAnalyze = (doc: Document) => {
    if (propOnAnalyzeDocument) {
      propOnAnalyzeDocument(doc);
    } else {
      setAnalyzingDoc(doc);
      setIsAnalyzeModalOpen(true);
    }
  };

  const handleSubmit = async (data: DocumentFormData) => {
    if (editingDoc) {
      await updateMutation.mutateAsync({
        id: editingDoc.id,
        payload: { ...data, event: eventId },
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleDeleteConfirm = async (docId: string) => {
    await deleteMutation.mutateAsync(docId);
  };

  return (
    <div className="event-tab-pane">
      {/* Create / Edit Document Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialDocument={editingDoc}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        document={deletingDoc}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />

      {/* AI Document Intelligence Modal */}
      <AnalyzeDocumentModal
        isOpen={isAnalyzeModalOpen}
        document={analyzingDoc}
        eventId={eventId}
        onClose={() => {
          setIsAnalyzeModalOpen(false);
          setAnalyzingDoc(null);
        }}
        onSuccess={(run) => {
          setDocumentToast({
            runId: run.id,
            summary: `Contract analysis completed for ${analyzingDoc?.title || "document"}. Proposal created and ready for review.`,
          });
        }}
      />

      {/* Success Notification Banner */}
      {documentToast && (
        <div
          className="risk-success-notification"
          role="status"
          data-testid="document-analysis-notification"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "var(--radius-md)",
            color: "#065f46",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "#059669", flexShrink: 0 }} />
            <span>
              <strong>Contract Analyzed:</strong> {documentToast.summary}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDocumentToast(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#065f46",
              padding: "0.2rem",
            }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tab Header */}
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">
            <FileText size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            Event Documents
          </h2>
          <p className="tab-pane-desc">
            Organize floor plans, vendor quotes, catering menus, and legal agreements.
          </p>
        </div>
      </div>

      {/* Document List */}
      <DocumentList
        documents={documents}
        isLoading={isLoading}
        onAddDocument={handleOpenAdd}
        onEditDocument={handleOpenEdit}
        onDeleteDocument={handleOpenDelete}
        onAnalyzeDocument={handleOpenAnalyze}
      />
    </div>
  );
};
