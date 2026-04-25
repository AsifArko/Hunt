# MVP Release Notes

## Scope delivered

- Foundation monorepo and package boundaries
- Strict core config and environment validation
- Domain contracts and error model
- Framework-free HTTP server with middleware/router
- MongoDB lifecycle and repository adapters
- GitHub OAuth auth flow + local JWT
- Repository management APIs with owner authorization
- Signed ingestion pipeline with idempotency + rate limiting
- Clone metrics poller with retry and dedupe handling
- Framework-free dashboard UI served by server
- Node SDK with signing, retries, timeout, and optional file queue
- Hardening updates and operational docs

## Critical path validated

- Auth → repository connect → signal ingestion → metrics endpoint view flow covered by automated tests.

## Known limitations (MVP)

- In-memory stores used for certain concerns in app-layer defaults (state/rate limiting)
- No advanced org/team role model yet
- No production-grade distributed job scheduler yet
