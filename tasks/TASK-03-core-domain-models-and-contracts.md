# TASK-03: Core Domain Models and Contracts

## Goal

Define shared domain types, validation contracts, and service interfaces for repositories, signals, claims, and metrics.

## Scope (only this task)

- Create TypeScript domain types in `packages/core`.
- Create DTOs and validation schemas/contracts.
- Define repository interfaces (not implementations).
- Define error model (`DomainError`, error codes).

## Out of scope

- No DB implementation.
- No HTTP handlers.

## Deliverables

1. Stable domain model definitions.
2. Input/output contracts for upcoming API endpoints.
3. Contract tests or compile-time checks for type safety.

## Acceptance criteria

- Domain types are framework-agnostic.
- All core entities from spec are represented.
- No circular dependencies in core module.

## Code quality rules (must follow)

- Clean code: keep domain definitions explicit and readable.
- Configurable code: avoid hidden behavior; use explicit options where needed.
- Modular code: core exposes interfaces only, not infrastructure details.
- Reusable code: contracts are portable across server/SDK/CLI.

## Suggested commit title

`feat(core): define domain models and service contracts`
