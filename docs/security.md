# EventOps Security Architecture (Living Document)

This document records the security mechanisms, tenant isolation guarantees, and defensive practices in EventOps. It is updated incrementally with each feature.

---

## 1. Multi-Tenant Isolation Boundary

1. **Root Boundary**: The `Organization` is the strict tenant boundary. No operational record (events, tasks, budgets, vendors, or documents) exists without an explicit foreign key to an `Organization`.
2. **User Authorization via `Membership`**:
   * Users do not own application data directly.
   * Access to organization resources is granted exclusively through verified `Membership` records.
   * A user may belong to multiple organizations with differing roles (e.g. `owner` in Org A, `viewer` in Org B).
3. **Data Integrity Constraints**:
   * `Membership` enforces `unique_together = ("organization", "user")` at the database level to prevent conflicting role assignments.
4. **API Queryset Tenant Isolation**:
   * All organization endpoints strictly enforce `Organization.objects.filter(memberships__user=request.user)`.
   * Unauthorized requests to foreign organization IDs return `404 Not Found` rather than leaking resource existence or metadata.
5. **Atomic Owner Bootstrapping**:
   * Creating a tenant executes inside a database transaction (`transaction.atomic`) to ensure the tenant row and the owner `Membership` are committed simultaneously, preventing orphaned tenants.

---

## 2. Insecure Direct Object Reference (IDOR) Defense

* **Cryptographic UUIDv4 Primary Keys**:
  * All public-facing models inherit from `apps.core.models.UUIDModel`.
  * Avoids auto-incrementing integer IDs (e.g. `1`, `2`, `3`), preventing external attackers from predicting or enumerating IDs across tenants.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Role | Scope | Tenant Management | Events & Budgets | Agent Proposal Approvals |
|---|---|---|---|---|
| **Owner** | Organization-wide | Full (billing, invites, deletions) | Full | Allowed |
| **Planner** | Organization-wide | Read-only | Full (create, edit, delete) | Allowed |
| **Coordinator** | Assigned events | None | Restricted to assigned tasks | Prohibited |
| **Viewer** | Organization-wide | None | Read-only | Prohibited |
