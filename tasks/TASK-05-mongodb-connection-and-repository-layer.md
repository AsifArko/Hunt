# TASK-05: MongoDB Connection and Repository Layer

## Goal

Implement MongoDB connection management and repository implementations in `packages/server` aligned with `packages/core` interfaces.

## Scope (only this task)

- Add MongoDB client bootstrap with lifecycle management.
- Implement repository adapters for:
  - users
  - repositories
  - clone metrics
  - signals
  - identity claims
- Add indexes and collection initialization logic.

## Out of scope

- No GitHub OAuth flow yet.
- No complex endpoint logic.

## Deliverables

1. Repositories that satisfy core interfaces.
2. Connection retry/timeout strategy.
3. Integration tests (preferably with test DB).

## Acceptance criteria

- Server can connect/disconnect cleanly.
- CRUD paths used by later tasks are functional.
- Index creation is deterministic and idempotent.

## Code quality rules (must follow)

- Clean code: isolate DB models, mappers, and repositories.
- Configurable code: DB URI, DB name, and timeouts come from config.
- Modular code: data layer is replaceable without changing domain contracts.
- Reusable code: shared base repository helpers reduce duplication.

## Suggested commit title

`feat(server): implement mongodb repositories and connection lifecycle`
