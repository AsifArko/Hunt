# Security Hardening Checklist

## Implemented controls

- [x] Signed ingestion requests (HMAC SHA-256)
- [x] Signature timestamp window checks
- [x] Idempotency support on ingestion
- [x] Ingestion rate limiting
- [x] Sensitive metadata hashing for ingestion payloads
- [x] Authenticated repository management endpoints
- [x] Security response headers:
  - `content-security-policy`
  - `x-frame-options`
  - `x-content-type-options`
  - `referrer-policy`
  - `permissions-policy`
- [x] JSON payload size limiting

## Dependency and vulnerability review

Audit command run:

```bash
npm audit --omit=dev
```

Result at time of writing: `found 0 vulnerabilities`.

## Remaining recommended improvements

- [ ] Replace in-memory state/rate-limit stores with distributed store for multi-instance deployments
- [ ] Add CSRF/session cookie mode for browser-auth flows
- [ ] Add structured audit logging retention policy
- [ ] Add automated license report generation in CI
