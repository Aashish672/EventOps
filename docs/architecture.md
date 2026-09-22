# EventOps Architecture Decisions (Living Document)

This document records the architectural structure, design patterns, and package boundaries in EventOps. It is updated incrementally with each feature.

---

## 1. Monorepo Package Boundaries

The backend adheres to a modular namespace structure inside `backend/apps/`:

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
3. **`abstract = True`**:
   * Ensures Django does not generate standalone tables for base models; fields are cleanly embedded into inheriting model tables.

---

## 3. Technology Stack & Service Boundaries

* **Backend Framework**: Python 3.13 + Django 5.1 + Django REST Framework.
* **Database**: PostgreSQL 16 (local container via Docker Compose; Supabase in production).
* **Testing Framework**: Pytest (`pytest-django`) with PostgreSQL and SQLite fallback.
* **Code Quality**: Ruff for ultra-fast linting and import formatting.
