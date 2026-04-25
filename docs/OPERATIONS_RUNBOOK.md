# Operations Runbook

## 1. Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or hosted)
- GitHub OAuth app credentials

## 2. Environment setup

1. Copy `.env.example` to `.env`.
2. Fill required values:
   - `HUNT_MONGODB_URI`
   - `HUNT_MONGODB_DB_NAME`
   - `HUNT_GITHUB_CLIENT_ID`
   - `HUNT_GITHUB_CLIENT_SECRET`
   - `HUNT_JWT_SECRET`
   - `HUNT_SIGNING_SECRET`

## 3. Build and verify

```bash
npm install
npm run build
npm run typecheck
npm run test
```

## 4. Start services (development)

Current server exports are framework-free primitives. Use package-level entry points according to your local startup wrapper.

## 5. Health checks

- API health endpoint: `GET /health`
- Expected: `200` with JSON `{ "status": "ok", "service": "@hunt/server" }`

## 6. Authentication smoke flow

1. `GET /auth/github/start`
2. Complete OAuth in browser.
3. `GET /auth/github/callback?code=...&state=...`
4. Store returned bearer token for API calls.

## 7. Repository flow smoke test

1. `POST /v1/repos/connect` (authorized)
2. `GET /v1/repos`
3. `GET /v1/repos/:repoId`
4. `PATCH /v1/repos/:repoId/settings`

## 8. Ingestion smoke test

1. Build signed payload for `POST /v1/signals`.
2. Include headers:
   - `x-hunt-signature`
   - `x-hunt-timestamp`
   - `idempotency-key`
3. Confirm first call `201`, replay `200` with `idempotentReplay: true`.

## 9. Dashboard smoke test

- Open `/dashboard`.
- Provide valid token.
- Confirm repo list and detail panes load.

## 10. Log review

Watch for:
- `request_failed` spikes
- `INVALID_SIGNATURE` bursts
- repeated `RATE_LIMITED` events
