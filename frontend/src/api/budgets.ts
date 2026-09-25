import { API_BASE_URL, getCommonHeaders } from "./core";
import { BudgetCategory, BudgetLineItem } from "./types";

export async function fetchBudgetCategories(eventId: string): Promise<BudgetCategory[]> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch budget categories");
  return response.json();
}

export async function createBudgetCategory(payload: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create budget category");
  return response.json();
}

export async function updateBudgetCategory(id: string, payload: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update budget category");
  return response.json();
}

export async function deleteBudgetCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete budget category");
}

export async function fetchBudgetLineItems(eventId: string): Promise<BudgetLineItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/budget-items/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch budget line items");
  return response.json();
}

export async function createBudgetLineItem(payload: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const response = await fetch(`${API_BASE_URL}/api/budget-items/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to create budget line item");
  return response.json();
}

export async function updateBudgetLineItem(id: string, payload: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const response = await fetch(`${API_BASE_URL}/api/budget-items/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update budget line item");
  return response.json();
}

export async function deleteBudgetLineItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/budget-items/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete budget line item");
}
