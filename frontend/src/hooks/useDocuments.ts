import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "../api/documents";
import { Document } from "../api/types";

export const documentKeys = {
  all: (eventId: string) => ["documents", eventId] as const,
};

export function useDocuments(eventId: string) {
  return useQuery({
    queryKey: documentKeys.all(eventId),
    queryFn: () => fetchDocuments(eventId),
    enabled: !!eventId,
  });
}

export function useCreateDocument(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Document>) => createDocument(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all(eventId) });
    },
  });
}

export function useUpdateDocument(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Document> }) =>
      updateDocument(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all(eventId) });
    },
  });
}

export function useDeleteDocument(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all(eventId) });
    },
  });
}
