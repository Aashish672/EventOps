import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAgentRuns,
  approveAgentRun,
  rejectAgentRun,
  editApproveAgentRun,
  fetchChangeLog,
  analyzeEventRisk,
} from "../api/agents";
import { ProposalDiff } from "../api/types";

export function useAgentRuns(eventId: string, state?: string) {
  return useQuery({
    queryKey: ["agent-runs", eventId, state],
    queryFn: () => fetchAgentRuns(eventId, state),
    enabled: Boolean(eventId),
  });
}

export function useChangeLog(eventId: string) {
  return useQuery({
    queryKey: ["change-log", eventId],
    queryFn: () => fetchChangeLog(eventId),
    enabled: Boolean(eventId),
  });
}

export function useApproveAgentRun(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => approveAgentRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", eventId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", eventId] });
      queryClient.invalidateQueries({ queryKey: ["budget-categories", eventId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-bookings", eventId] });
      queryClient.invalidateQueries({ queryKey: ["change-log", eventId] });
    },
  });
}

export function useRejectAgentRun(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, reason }: { runId: string; reason?: string }) =>
      rejectAgentRun(runId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", eventId] });
      queryClient.invalidateQueries({ queryKey: ["change-log", eventId] });
    },
  });
}

export function useEditApproveAgentRun(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, modifiedDiff }: { runId: string; modifiedDiff: ProposalDiff }) =>
      editApproveAgentRun(runId, modifiedDiff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", eventId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", eventId] });
      queryClient.invalidateQueries({ queryKey: ["budget-categories", eventId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-bookings", eventId] });
      queryClient.invalidateQueries({ queryKey: ["change-log", eventId] });
    },
  });
}

export function useAnalyzeEventRisk(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) => analyzeEventRisk(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", eventId] });
    },
  });
}

