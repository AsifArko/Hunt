# TASK-07: Repository Management API

## Goal

Implement authenticated repository connection and settings management endpoints.

## Scope (only this task)

- Implement endpoints:
  - `POST /v1/repos/connect`
  - `GET /v1/repos`
  - `GET /v1/repos/:repoId`
  - `PATCH /v1/repos/:repoId/settings`
- Validate ownership/authorization checks.
- Generate and store `projectToken` securely (hashed at rest).

## Out of scope

- No signal ingestion.
- No metrics polling.

## Deliverables

1. Repository CRUD-like flows for owner.
2. Validation and authorization guard integration.
3. Endpoint tests for permission and validation paths.

## Acceptance criteria

- Authenticated user can connect and view own repos.
- Non-owner cannot read/update another owner repo settings.
- Tokens returned once (write-only secret pattern).

## Code quality rules (must follow)

- Clean code: handlers delegate to service layer, no fat controllers.
- Configurable code: token length/expiry/security flags in config.
- Modular code: authorization logic in dedicated guard/policy unit.
- Reusable code: response serializers shared across repo endpoints.

## Suggested commit title

`feat(api): add repository connect and settings endpoints`
