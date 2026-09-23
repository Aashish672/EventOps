# EventOps Architecture Decisions (Living Document)

This document records the architectural structure, design patterns, and package boundaries in EventOps. It is updated incrementally with each feature.

---

## 1. Monorepo Package Boundaries

The backend adheres to a modular namespace structure inside `backend/apps/`. The `backend/apps/` directory is added to `sys.path`, allowing domain apps to be imported directly (`from core.models import ...`, `from organizations.models import ...`):

```
backend/
├── config/              # Global Django settings, URLs, Celery, ASGI/WSGI
├── apps/
│   ├── core/            # Cross-cutting concerns: base models, health check, audit helpers
│   └── organizations/   # Tenant boundary, memberships, and organizational RBAC
```

---

## 2. Shared Base Class Patterns (`apps.core.models`)

To eliminate code duplication across 10+ relational models while enforcing consistent security and auditing standards:

1. **`UUIDModel`**:
   * Declares `id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
   * Enforced across all primary domain entities.
2. **`TimeStampedModel`**:
   * Declares `created_at` (`auto_now_add=True`) and `updated_at` (`auto_now=True`).
   * Provides consistent auditing across all operational entities.
3. **`TenantModel`**:
   * Combines `UUIDModel` and `TimeStampedModel`.
   * Enforces an indexed `ForeignKey` to `organizations.Organization` on every tenant-scoped child entity.
   * Utilizes dynamic `related_name="%(app_label)s_%(class)ss"` to avoid reverse-relation collisions across child apps.
4. **`abstract = True`**:
   * Ensures Django does not generate standalone tables for base models; fields are cleanly embedded into inheriting model tables.

---

## 3. Technology Stack & Service Boundaries

* **Backend Framework**: Python 3.13 + Django 5.1 + Django REST Framework.
* **Database**: PostgreSQL 16 (local container via Docker Compose; Supabase in production).
* **Testing Framework**: Pytest (`pytest-django`) with PostgreSQL and SQLite fallback.
* **Code Quality**: Ruff for ultra-fast linting and import formatting.

---

## 4. Multi-Tenant REST API Layer (`apps.organizations`)

### `OrganizationViewSet` (`/api/orgs/`)
* **Endpoint Pattern**: Centralized DRF `ModelViewSet` handling tenant lifecycle and team memberships.
* **Tenant Queryset Isolation**:
  * `get_queryset()` queries `Organization.objects.filter(memberships__user=self.request.user).distinct()`.
  * Users can only see or interact with organizations where they have an active `Membership`.
* **Atomic Tenant Bootstrapping**:
  * `perform_create()` executes within `transaction.atomic()`.
  * Saves the new `Organization` and immediately generates an initial `Membership` with `role="owner"` for the requesting user.
  * Guarantees an organization cannot exist without an owner.
* **Nested Membership Actions**:
  * `@action(detail=True, methods=["get", "post"], url_path="members")`:
    * `GET`: Lists all organization members, users, and roles via `MembershipSerializer` (available to all members).
    * `POST`: Adds or invites a user to the organization by email (guarded by `IsOrganizationOwner`).
  * `@action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")`:
    * `DELETE`: Removes a team member from the organization (guarded by `IsOrganizationOwner` and sole-owner safety check).
* **Server-Side RBAC Enforcement (`get_permissions`)**:
  * Destructive and tenant-mutation actions (`update`, `partial_update`, `destroy`) dynamically require `IsOrganizationOwner`.
  * Read actions (`retrieve`, `members:GET`) require active membership (`IsOrganizationMember`).

---

## 5. Frontend Multi-Tenant Architecture (`frontend/src`)

### State Management & Context (`context/`)
* **`OrganizationContext` & `OrganizationProvider`**:
  * Tracks global `activeOrg` and available `organizations` list across the application.
  * Persists selected organization in `localStorage` (`eventops_active_org_id`) to retain tenant context across page reloads.
  * Manages active tenant members and role permissions (`currentUserRole`).
  * Graceful Unauthenticated Fallback: Provides pre-seeded demo tenants ("Apex Event Agency", "Summit Global Ops") if the backend returns 401 or during local demo mode, ensuring instant recruiter click-through capability per PRD §4.

### Component Structure (`components/`)
* **`Navbar`**:
  * Persistent header featuring brand identity, user role badge, and active tenant indicator.
  * **Organization Switcher Dropdown**:
    * Displays active organization with checkmark.
    * Lists all organizations the user belongs to with quick switching.
    * Bottom trigger to open the modal for provisioning a new tenant.
* **`CreateOrgModal`**:
  * Accessible dialog with backdrop blur, keyboard ESC dismissal, autofocus, and real-time URL slug preview (`/orgs/{slug}`).
* **`TeamMemberList`**:
  * Renders active tenant members with user avatars and role badges (`Owner`, `Planner`, `Coordinator`, `Viewer`).
  * Provides owner-only member invitation by email and role assignment.
  * Enforces member removal with sole-owner safety check matching backend guardrails.
