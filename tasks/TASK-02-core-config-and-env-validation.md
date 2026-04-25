# TASK-02: Core Config and Environment Validation

## Goal

Implement centralized configuration loading and strict environment validation in `packages/core`.

## Scope (only this task)

- Create config module in `packages/core`:
  - Read env vars.
  - Validate required values and types.
  - Export immutable typed config object.
- Add config error reporting with actionable messages.
- Create sample `.env.example` template at root.

## Out of scope

- No API server routes yet.
- No DB writes.

## Deliverables

1. Typed config interfaces.
2. `loadConfig()` (or equivalent) function with validation.
3. Unit tests for happy/failure config paths.

## Acceptance criteria

- Invalid or missing env vars fail fast with clear messages.
- Valid env produces typed, stable config object.
- No package reads `process.env` directly except config layer.

## Code quality rules (must follow)

- Clean code: separate parsing, validation, and mapping logic.
- Configurable code: all runtime knobs come from validated config.
- Modular code: config module has no dependency on HTTP/DB layers.
- Reusable code: config utilities can be consumed by server, SDK, and CLI.

## Suggested commit title

`feat(core): add typed env config loader and validation`
