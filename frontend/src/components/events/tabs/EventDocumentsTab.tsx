import React, { useState } from "react";
import { FileText } from "lucide-react";
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
import "../documents/documents.css";

interface EventDocumentsTabProps {
  onAddDocument?: () => void;
  onEditDocument?: (doc: Document) => void;
  onDeleteDocument?: (doc: Document) => void;
}

export const EventDocumentsTab: React.FC<EventDocumentsTabProps> = ({
  onAddDocument: propOnAddDocument,
  onEditDocument: propOnEditDocument,
  onDeleteDocument: propOnDeleteDocument,
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
      />
    </div>
  );
};
