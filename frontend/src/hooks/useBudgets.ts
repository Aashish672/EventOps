import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  fetchBudgetLineItems,
  createBudgetLineItem,
  updateBudgetLineItem,
  deleteBudgetLineItem,
} from "../api/budgets";
import { BudgetCategory, BudgetLineItem } from "../api/types";

export const budgetKeys = {
  categories: (eventId: string) => ["budget_categories", eventId] as const,
  lineItems: (eventId: string) => ["budget_line_items", eventId] as const,
};

// Categories
export function useBudgetCategories(eventId: string) {
  return useQuery({
    queryKey: budgetKeys.categories(eventId),
    queryFn: () => fetchBudgetCategories(eventId),
    enabled: !!eventId,
  });
}

export function useCreateBudgetCategory(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BudgetCategory>) => createBudgetCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.categories(eventId) });
    },
  });
}

export function useUpdateBudgetCategory(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BudgetCategory> }) =>
      updateBudgetCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.categories(eventId) });
    },
  });
}

export function useDeleteBudgetCategory(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudgetCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.categories(eventId) });
    },
  });
}

// Line Items
export function useBudgetLineItems(eventId: string) {
  return useQuery({
    queryKey: budgetKeys.lineItems(eventId),
    queryFn: () => fetchBudgetLineItems(eventId),
    enabled: !!eventId,
  });
}

export function useCreateBudgetLineItem(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BudgetLineItem>) => createBudgetLineItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItems(eventId) });
    },
  });
}

export function useUpdateBudgetLineItem(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BudgetLineItem> }) =>
      updateBudgetLineItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItems(eventId) });
    },
  });
}

export function useDeleteBudgetLineItem(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudgetLineItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lineItems(eventId) });
    },
  });
}
