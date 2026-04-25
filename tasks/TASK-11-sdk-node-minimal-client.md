# TASK-11: SDK Node Minimal Client

## Goal

Implement reusable Node SDK package for third-party project integration and secure signal delivery.

## Scope (only this task)

- Create SDK public API:
  - `createCloneIntelClient(config)`
  - `captureEvent(eventType, payload?)`
- Add request signing compatible with server verification.
- Add retry/backoff and timeout handling.
- Add optional file-backed queue for temporary offline retries.
- Add package docs and usage examples.

## Out of scope

- No browser SDK.
- No advanced plugin system yet.

## Deliverables

1. Published-ready package structure and typings.
2. Robust network/error handling.
3. Integration test against local server endpoint.

## Acceptance criteria

- SDK can send valid signed signals to ingestion endpoint.
- Consumer can configure API URL/token without code changes.
- Type definitions and example usage are complete.

## Code quality rules (must follow)

- Clean code: split transport client, signer, and queue modules.
- Configurable code: retries/timeouts/batch behavior configurable.
- Modular code: no server internals imported into SDK package.
- Reusable code: exported interfaces stable and documented.

## Suggested commit title

`feat(sdk): add node client for signed event capture`
