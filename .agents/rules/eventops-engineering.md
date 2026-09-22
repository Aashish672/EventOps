---
trigger: always_on
---


# EventOps Engineering Rules

## Project context
- Read docs/PRD.md and relevant architecture documents before implementing a feature.
- EventOps is a multi-tenant event operations platform.
- Backend: Python, Django, Django REST Framework.
- Frontend: React, TypeScript, Vite.
- Database: PostgreSQL.
- AI orchestration: LangGraph.
- Follow the architecture decisions recorded in docs/.

## Engineering practices
- Prefer clear, modular, maintainable code over unnecessary abstraction.
- Keep business logic out of views and UI components where practical.
- Use type hints for Python code and strict TypeScript types.
- Follow Django and React conventions.
- Avoid duplicating existing functionality.
- Do not introduce new dependencies without explaining why they are needed.

## Security and tenant isolation
- Treat organization/tenant isolation as a core security requirement.
- Never trust organization IDs, role names, ownership or permissions supplied by the client.
- Enforce authorization on the server for every protected operation.
- Do not expose secrets, tokens, private documents or internal agent state.
- Do not weaken authentication, permissions or validation to make tests pass.
- Never put production credentials in source code or frontend environment variables.

## AI agent governance
- Agents must use explicitly scoped, read-only tools to inspect application data.
- Agents must not directly modify business records.
- Agent output is a proposal, not an authorized database mutation.
- Only the approved application workflow may apply a proposal.
- Validate proposal schemas, permissions and relevant record versions before applying changes.
- Record approval and application outcomes in the audit trail.

## Development workflow
- Before coding,create implementation plan and ask for review, summarize the intended changes and identify affected files.
- For non-trivial tasks, propose a plan and wait for approval.
- Make focused changes rather than rewriting unrelated files.
- Add or update tests for changed behavior.
- Run relevant tests and report the actual commands and results.
- Add relevant logging everywhere for future debugging for any issue
- Never claim tests passed unless they were actually run.
- Do not silently skip failing tests.
- Explain migrations and any destructive or irreversible operation before running it.
- Do not commit, push, deploy or modify production resources without explicit approval.

## AI-assisted development
- AI tools may draft boilerplate, repetitive code, documentation and tests.
- The developer remains responsible for reviewing architecture, business logic,
  security, integrations, generated tests and final behavior.
- Explain important implementation decisions rather than only returning code.