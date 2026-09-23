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

---

## 4. DRF RBAC Permission Classes (`core.permissions`)

Server-side permission classes guard all API routes against unauthorized mutations:
1. **`IsOrganizationMember`**:
   * Inspects `obj` (whether an `Organization` or a `TenantModel` child entity) and verifies that `Membership.objects.filter(organization=org, user=request.user).exists()`.
   * Grants safe read access (`GET`, `HEAD`, `OPTIONS`) to all verified tenant members.
2. **`IsOrganizationPlannerOrOwner`**:
   * Grants safe read access to all members, but strictly requires `role in ("owner", "planner")` for mutating operations (`POST`, `PUT`, `PATCH`, `DELETE`).
   * Designed for upcoming Event and Budget resource CRUD in Sprint 2.
3. **`IsOrganizationOwner`**:
   * Strictly restricts operations to users with the `owner` role in the organization.
   * Enforced on organization renaming (`PATCH /api/orgs/{id}/`), deletion (`DELETE /api/orgs/{id}/`), member invitations (`POST /api/orgs/{id}/members/`), and member removals (`DELETE /api/orgs/{id}/members/{user_id}/`).
4. **Sole Owner Protection**:
   * When an owner attempts to delete a member, the system verifies that a sole owner cannot remove themselves (`HTTP 400 Bad Request`), preventing the creation of orphaned organizations without administrative governance.
