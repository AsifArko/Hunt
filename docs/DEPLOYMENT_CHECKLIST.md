# Deployment Checklist

## Pre-deploy

- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `.env` values validated and secrets rotated for target environment
- [ ] MongoDB connectivity verified from deploy environment
- [ ] OAuth callback URL configured in GitHub app for target domain

## Security checks

- [ ] `HUNT_JWT_SECRET` is strong and unique
- [ ] `HUNT_SIGNING_SECRET` is strong and unique
- [ ] HTTP payload limit configured (`http.maxBodyBytes` app config path)
- [ ] Security response headers enabled (CSP, X-Frame-Options, X-Content-Type-Options)

## Data and reliability

- [ ] Mongo indexes initialize cleanly on startup
- [ ] Clone metrics poller retry settings reviewed
- [ ] Idempotency behavior verified in staging
- [ ] Queue path for SDK-enabled consumers is writable (if used)

## Release

- [ ] Tag release commit
- [ ] Record release notes in `docs/RELEASE_NOTES_MVP.md`
- [ ] Run post-deploy health and critical-path checks
