import { API_BASE_URL, getCommonHeaders } from "./core";
import { BudgetCategory, BudgetLineItem } from "./types";

// ─── Budget Categories ───────────────────────────────────────────────────────

export async function fetchBudgetCategories(eventId: string): Promise<BudgetCategory[]> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch budget categories (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createBudgetCategory(payload: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create budget category (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateBudgetCategory(id: string, payload: Partial<BudgetCategory>): Promise<BudgetCategory> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update budget category (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteBudgetCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/budget-categories/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete budget category (HTTP ${response.status})`);
  }
}

// ─── Budget Line Items ───────────────────────────────────────────────────────

export async function fetchBudgetLineItems(eventId: string): Promise<BudgetLineItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/budget-line-items/?event=${eventId}`, {
    method: "GET",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch budget line items (HTTP ${response.status})`);
  }
  return response.json();
}

export async function createBudgetLineItem(payload: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const response = await fetch(`${API_BASE_URL}/api/budget-line-items/`, {
    method: "POST",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create budget line item (HTTP ${response.status})`);
  }
  return response.json();
}

export async function updateBudgetLineItem(id: string, payload: Partial<BudgetLineItem>): Promise<BudgetLineItem> {
  const response = await fetch(`${API_BASE_URL}/api/budget-line-items/${id}/`, {
    method: "PATCH",
    headers: await getCommonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update budget line item (HTTP ${response.status})`);
  }
  return response.json();
}

export async function deleteBudgetLineItem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/budget-line-items/${id}/`, {
    method: "DELETE",
    headers: await getCommonHeaders(),
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete budget line item (HTTP ${response.status})`);
  }
}
