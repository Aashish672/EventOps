## Summary of Changes
<!-- Provide a concise description of what this PR introduces and why. -->

## Branch Verification
- [ ] This PR targets `test` (for feature branches) OR `main` (for tested release promotions).
- [ ] Feature branch was created from latest `test`.

## Security & Architectural Checklist
- [ ] **Multi-Tenant Isolation**: All queries/mutations enforce `organization_id` boundaries.
- [ ] **AI Governance**: No agent tool performs direct DB writes; changes use single-write-path proposals.
- [ ] **Zero Secrets**: No API keys, passwords, or live credentials in source code or commits.
- [ ] **Logging & Observability**: Diagnostic logging added for tracing and debugging.

## Verification & Tests
- [ ] Backend tests passing (`pytest`)
- [ ] Backend linting clean (`ruff check backend/`)
- [ ] Django system check passes (`python manage.py check`)
- [ ] Frontend linting clean (`npm run lint`)
- [ ] Frontend build succeeds (`npm run build`)
