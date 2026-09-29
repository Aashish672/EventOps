import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTasks, createTask, updateTask, deleteTask } from "../api/tasks";
import { Task } from "../api/types";

export const taskKeys = {
  all: (eventId: string) => ["tasks", eventId] as const,
};

export function useTasks(eventId: string) {
  return useQuery({
    queryKey: taskKeys.all(eventId),
    queryFn: () => fetchTasks(eventId),
    enabled: !!eventId,
  });
}

export function useCreateTask(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Task>) => createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(eventId) });
    },
  });
}

export function useUpdateTask(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Task> }) =>
      updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(eventId) });
    },
  });
}

export function useDeleteTask(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(eventId) });
    },
  });
}
