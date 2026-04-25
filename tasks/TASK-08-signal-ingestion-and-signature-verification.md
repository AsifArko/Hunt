# TASK-08: Signal Ingestion and Signature Verification

## Goal

Implement secure ingestion endpoint for SDK-generated signals and optional identity claim submission.

## Scope (only this task)

- Implement endpoint:
  - `POST /v1/signals`
- Add request signature verification (HMAC-based).
- Add idempotency support for duplicate retries.
- Add optional endpoint:
  - `POST /v1/claims` (basic claim create)
- Add ingestion rate limiting.

## Out of scope

- No advanced confidence scoring yet.
- No dashboard visuals.

## Deliverables

1. Signed ingestion processing pipeline.
2. Signal persistence with normalized metadata.
3. Tests for invalid signatures, replay, and idempotency.

## Acceptance criteria

- Unsigned or invalid-signature requests are rejected.
- Valid signed request is persisted exactly once for same idempotency key.
- Sensitive raw metadata is hashed/redacted according to policy.

## Code quality rules (must follow)

- Clean code: keep cryptography helpers isolated and unit-tested.
- Configurable code: algorithm, window, and rate limits configurable.
- Modular code: ingestion verification separate from storage implementation.
- Reusable code: signature verifier can be reused by webhook endpoints.

## Suggested commit title

`feat(api): add signed signal ingestion with idempotency controls`
