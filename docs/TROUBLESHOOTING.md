# Troubleshooting Guide

## 1. OAuth callback fails with `INVALID_OAUTH_STATE`

Likely causes:
- callback called twice with same state
- state expired before callback
- cross-origin/callback mismatch

Actions:
- restart login at `/auth/github/start`
- verify callback host/protocol matches configured app URL

## 2. Ingestion fails with `INVALID_SIGNATURE`

Likely causes:
- signing secret mismatch
- timestamp too old/new
- payload canonicalization mismatch

Actions:
- ensure SDK/server use same signing secret
- ensure system clocks are synced
- verify signature uses `timestamp + "." + canonical-json(payload)`

## 3. Ingestion replay does not dedupe

Likely causes:
- missing `idempotency-key` header
- key changes across retries

Actions:
- set stable idempotency key per retry series

## 4. `FORBIDDEN` on repository endpoints

Likely causes:
- token user does not match repository owner

Actions:
- authenticate as correct owner account
- check connected repository owner field

## 5. Dashboard shows empty metrics

Likely causes:
- no poller run yet
- repo recently connected
- no clone traffic available in GitHub window

Actions:
- run poller once manually in dev flow
- verify metrics endpoint returns items

## 6. Large payload rejected (`PAYLOAD_TOO_LARGE`)

Likely causes:
- request body over configured limit

Actions:
- reduce payload metadata size
- increase `http.maxBodyBytes` in app config where safe
