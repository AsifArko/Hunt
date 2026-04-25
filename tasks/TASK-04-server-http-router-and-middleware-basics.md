# TASK-04: Server HTTP Router and Middleware Basics

## Goal

Build framework-free HTTP server skeleton in `packages/server` using Node `http` with routing and middleware primitives.

## Scope (only this task)

- Create HTTP server bootstrap.
- Implement simple router (`method + path` matching).
- Implement middleware chain for:
  - request ID
  - JSON body parsing
  - error handling
  - basic logging
- Add health endpoint: `GET /health`.

## Out of scope

- No auth.
- No repository endpoints.
- No database persistence.

## Deliverables

1. Running HTTP service with health response.
2. Reusable router and middleware abstractions.
3. Basic tests for routing and middleware behavior.

## Acceptance criteria

- Server starts from config-defined port.
- Invalid JSON returns clean error response.
- Unhandled errors are normalized to safe JSON error format.

## Code quality rules (must follow)

- Clean code: split transport, middleware, and handlers clearly.
- Configurable code: logging level and port are config-driven.
- Modular code: router does not depend on business services directly.
- Reusable code: middleware utilities can be reused across endpoints.

## Suggested commit title

`feat(server): add framework-free http server and router primitives`
