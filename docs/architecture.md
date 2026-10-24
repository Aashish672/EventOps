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
│   ├── organizations/   # Tenant boundary, memberships, and organizational RBAC
│   ├── events/          # Events, tasks, budgets, guests, vendors, documents
│   ├── vendors/         # Vendor directory and service categories
│   └── agents/          # AI agent governance, LangGraph workflows, and Single Write Path
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

---

## 6. AI Agent Architecture & Governance Layer (`apps.agents`)

### Core Philosophy: Human-in-the-Loop & Single Write Path
In EventOps, AI agents act as intelligent analytical advisors, never autonomous database mutators. All agent workflows strictly adhere to the following governance rules:
1. **Read-Only Inspection**: Agents only query application data through explicitly scoped, tenant-isolated tools (`get_event_summary`, `get_event_tasks`, `get_event_budget`, `get_event_vendors`).
2. **Proposal Mutation Schema**: Agent recommendations are serialized into an auditable `AgentRun` proposal with status `pending`. Proposals conform to the Single Write Path format:
   ```json
   {
     "mutations": [
       {
         "action": "update",
         "entity_type": "Task",
         "entity_id": "<uuid>",
         "fields": { "due_date": "2026-11-20T10:00:00Z" }
       }
     ]
   }
   ```
3. **Atomic Human Approval**: Only authorized human planners or owners can approve, reject, or edit-approve proposals via `apply_agent_proposal()`. Database mutations execute inside an atomic transaction.
4. **Immutable Audit Trail**: Every applied proposal automatically generates a `ChangeLogEntry` recording `actor_type="agent"`, `actor_id="<agent_type>"`, before/after diffs, and the human reviewer who authorized the change.

### Subsystem Components (`apps/agents/orchestration/`)
* **`TaskDependencyEngine` (`engine.py`)**:
  * Fast in-memory calculation of schedule slippage (`delta_days`).
  * Proportional task deadline adjustment, late margin calculation (`hours before kickoff`), and conflict boundary detection.
  * Domain keyword scanning for vendor contract cancellation fallouts (e.g., catering, venue, audio/visual).
* **Automated Lifecycle Signals (`signals.py`)**:
  * Pre-save hooks (`capture_event_pre_save_state`, `capture_vendor_booking_pre_save_state`) snapshot existing database state.
  * Post-save listeners detect schedule shifts and vendor contract cancellations, automatically registering pending proposals without blocking primary save operations.
* **Multi-Provider LLM Factory (`llm.py`)**:
  * Free Primary: Groq (`llama-3.3-70b-versatile`).
  * Free Fallback: Google Gemini (`gemini-2.0-flash`).
  * Deterministic Offline Mock: `MockRiskImpactLLM` enabling zero-credential local development and CI testing.
* **3-Node LangGraph StateGraph (`graph.py`)**:
  * `inspect_context`: Gathers real-time read-only snapshots.
  * `evaluate_ripple_effects`: Multi-provider LLM Chain-of-Thought reasoning with Pydantic structured output (`RiskRemediationProposal`).
  * `generate_remediation_proposal`: Formats recommendations into Single Write Path mutations.
* **On-Demand REST API Action**:
  * `POST /api/events/{id}/analyze-risk/` on `EventViewSet` allows planners to trigger on-demand assessments directly from the UI.

