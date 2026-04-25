# TASK-12: Hardening, Tests, and Release Readiness

## Goal

Stabilize the system end-to-end: tests, security checks, performance sanity, docs, and release preparation.

## Scope (only this task)

- Expand automated test coverage:
  - core unit tests
  - server integration tests
  - SDK contract tests
- Add security hardening:
  - stricter headers
  - input limits
  - dependency/license audit (free/open-source only)
- Add operational docs:
  - local runbook
  - deployment checklist
  - incident/troubleshooting notes

## Out of scope

- No new feature scope unless needed to fix confirmed bugs.

## Deliverables

1. Test suite with meaningful coverage for critical flows.
2. Hardening checklist completed.
3. MVP release notes and setup documentation.

## Acceptance criteria

- Critical path (auth -> repo connect -> ingestion -> metrics view) passes.
- No known blocker/severity-1 bug remains in MVP scope.
- Docs are sufficient for another developer to run and verify locally.

## Code quality rules (must follow)

- Clean code: refactor only where it increases clarity and safety.
- Configurable code: operational defaults configurable via env.
- Modular code: keep hardening changes within proper layers.
- Reusable code: tests/utilities should be reusable for future features.

## Suggested commit title

`chore: harden platform and finalize mvp readiness`
