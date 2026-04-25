# TASK-10: Dashboard (Vanilla Web UI)

## Goal

Build a framework-free dashboard UI served by the Node server to display repositories, clone metrics, and claims.

## Scope (only this task)

- Build static frontend assets in `packages/web` (vanilla TS/JS + CSS).
- Add authenticated pages:
  - repo list
  - repo detail with clone trend
  - identity claims list
- Integrate with existing API endpoints.

## Out of scope

- No advanced charting library requirement (simple SVG/canvas allowed).
- No complex design system.

## Deliverables

1. Working dashboard pages and API integration.
2. Basic client-side state and error handling.
3. Loading and empty-state UX.

## Acceptance criteria

- User can view clone history for selected repository.
- Errors are shown as clear UI messages.
- No framework dependency introduced.

## Code quality rules (must follow)

- Clean code: separate API client, UI rendering, and state management.
- Configurable code: API base path and feature flags configurable.
- Modular code: UI components/functions are small and composable.
- Reusable code: shared utility functions for formatting and fetch handling.

## Suggested commit title

`feat(web): add framework-free dashboard for clones and claims`
