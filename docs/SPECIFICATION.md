# Clone Intelligence Platform - Specification (Phase 1: Docs)

## 1) Vision

Build a web application and reusable JavaScript/TypeScript module that helps repository owners understand clone activity around their codebases.

Primary stack constraints:
- Runtime: Node.js
- Language: TypeScript + JavaScript interoperability
- Database: MongoDB
- Frameworks: none (no Express/Nest/Next/etc.)
- Libraries: free/open-source only
- Code quality: clean, modular, reusable, configurable

## 2) Critical Reality Check (Must Be Accepted)

GitHub does **not** provide the identity of people who run `git clone` for public repositories through normal APIs.

Implications:
- We can track aggregate clone counts from GitHub Traffic APIs.
- We cannot directly know "who cloned" by GitHub username from clone network traffic alone.
- To identify a person, we need an **additional identity step** (for example, GitHub OAuth authorization from the user).

Therefore, this project is designed with:
1. **Observed Clone Metrics** (anonymous aggregate counts from GitHub)
2. **Claimed Clone Identity** (user voluntarily proves identity through GitHub OAuth)
3. **Confidence Levels** to avoid false claims

## 3) Product Goals

1. Allow repository owners to connect repositories and monitor clone trends.
2. Provide a reusable SDK/module that other projects can integrate.
3. Support identity collection in a privacy-conscious, opt-in way.
4. Keep architecture framework-free and easy to embed in other systems.
5. Make the core tracking logic usable as:
   - standalone service
   - embeddable package in another project
   - optional CLI integration

## 4) Non-Goals

1. No stealth or non-consensual tracking.
2. No attempt to bypass GitHub or Git protocol privacy boundaries.
3. No claim of 100% identification of all clone actions.
4. No paid SaaS dependency requirement.

## 5) High-Level Architecture

Monorepo layout proposal:

```text
hunt/
  docs/
    SPECIFICATION.md
  packages/
    core/              # Domain logic, shared types, validation, config
    sdk-node/          # Reusable module for other projects (Node integration)
    cli/               # Optional CLI for setup/check/reporting
    server/            # HTTP API server (framework-free)
    web/               # Front-end assets (vanilla JS/TS) served by server
```

### 5.1 Components

1. **API Server (`packages/server`)**
   - Built with Node `http` module
   - REST-style endpoints
   - Handles auth, repository configuration, event ingestion, reporting

2. **Core Domain (`packages/core`)**
   - Event models
   - Validation helpers
   - Scoring/confidence computation
   - Shared interfaces used by all packages

3. **SDK Module (`packages/sdk-node`)**
   - Imported by third-party projects
   - Sends telemetry events to API
   - Provides helper commands and setup utilities
   - Highly configurable via environment variables and explicit config

4. **CLI (`packages/cli`)**
   - Setup commands for repository owners
   - Generates integration snippets
   - Health checks and token validation

5. **Web UI (`packages/web`)**
   - Vanilla frontend (no React/Vue/Angular)
   - Dashboard: clone metrics, identity claims, confidence score

6. **MongoDB (`database`)**
   - Stores users, repositories, events, claims, tokens, audit logs

## 6) Identity Strategy

Since clone identity is not natively available, use a layered model:

### 6.1 Layer A - Aggregate Clone Signal (GitHub)
- Pull traffic clone counts periodically from GitHub API for connected repos.
- Store time-series counts (`total_count`, `unique_count`, `date_window`).

### 6.2 Layer B - SDK/Integration Signal
- Projects using SDK emit events when configured operations run (for example onboarding command, post-clone guide command, optional CI signal, optional local command).
- This gives device/session-level anonymous traceability (not guaranteed GitHub user identity).

### 6.3 Layer C - Identity Claim via OAuth (Required for "who")
- User completes GitHub OAuth in hosted web app.
- App links claim to repository and proof token/challenge.
- System marks identity confidence:
  - `low`: anonymous signal only
  - `medium`: signal + user claim
  - `high`: claim + cryptographic challenge bound to repo/session

## 7) Reusable Module Design Requirements

The module must be easy to use in any Node project:

```ts
import { createCloneIntelClient } from "@hunt/sdk-node";

const client = createCloneIntelClient({
  apiBaseUrl: process.env.HUNT_API_URL,
  projectToken: process.env.HUNT_PROJECT_TOKEN,
  repo: {
    owner: "example",
    name: "repo-name"
  }
});

await client.captureEvent("integration_initialized");
```

### 7.1 SDK capabilities
- Config validation
- Retry with exponential backoff
- Timeout + circuit-breaker-like protection
- Signature headers for server verification
- Offline queue (file-backed optional)
- Structured logs
- Opt-out and data-minimization flags

### 7.2 Embedding in other projects
- Offer module APIs, CLI setup, and minimal boilerplate.
- No framework assumptions.
- Works with CommonJS and ESM.

## 8) Data Model (MongoDB Collections)

1. `users`
   - `githubId`, `username`, `avatarUrl`, `oauthScopes`, `createdAt`, `updatedAt`

2. `repositories`
   - `owner`, `name`, `githubRepoId`, `defaultBranch`
   - `projectTokenHash`
   - `settings` (privacy, retention, claim policy)

3. `clone_metrics`
   - `repositoryId`
   - `windowStart`, `windowEnd`
   - `totalClones`, `uniqueCloners`
   - `source` = `github_traffic_api`

4. `signals`
   - `repositoryId`, `eventType`, `eventTimestamp`
   - `sessionId`, `fingerprintHash`, `ipHash`, `userAgentHash`
   - `metadata` (strictly controlled)

5. `identity_claims`
   - `repositoryId`, `userId`, `claimTimestamp`
   - `proofType`, `proofPayload`, `confidenceLevel`
   - `verificationStatus`

6. `audit_logs`
   - action trail for auth, settings, ingestion and moderation

## 9) Security and Privacy

1. Never store raw personal identifiers when avoidable.
2. Hash IP/user-agent before persistence.
3. Encrypt secrets at rest (project tokens, OAuth secrets).
4. Signed ingestion requests with rotating keys.
5. Strict rate limits per token/IP.
6. Consent-first identity flow and clear privacy notices.
7. Configurable retention policy and deletion workflows.

## 10) API Contract (Initial)

### Public/Auth
- `GET /health`
- `GET /auth/github/start`
- `GET /auth/github/callback`

### Repository management
- `POST /v1/repos/connect`
- `GET /v1/repos`
- `GET /v1/repos/:repoId`
- `PATCH /v1/repos/:repoId/settings`

### Ingestion
- `POST /v1/signals` (SDK event ingestion)
- `POST /v1/claims` (identity claim submission)

### Analytics
- `GET /v1/repos/:repoId/metrics/clones`
- `GET /v1/repos/:repoId/claims`
- `GET /v1/repos/:repoId/insights`

## 11) Configuration

Environment variables (initial):
- `HUNT_NODE_ENV`
- `HUNT_PORT`
- `HUNT_MONGODB_URI`
- `HUNT_MONGODB_DB_NAME`
- `HUNT_GITHUB_CLIENT_ID`
- `HUNT_GITHUB_CLIENT_SECRET`
- `HUNT_GITHUB_WEBHOOK_SECRET` (optional future)
- `HUNT_JWT_SECRET`
- `HUNT_SIGNING_SECRET`
- `HUNT_LOG_LEVEL`

SDK env:
- `HUNT_API_URL`
- `HUNT_PROJECT_TOKEN`
- `HUNT_REPO_OWNER`
- `HUNT_REPO_NAME`

## 12) Code Quality Standards

1. Strict TypeScript for core packages.
2. Separation of concerns:
   - transport layer
   - domain services
   - repository/data access layer
   - validation layer
3. Pure functions where possible.
4. Dependency injection via constructor/factory patterns.
5. Explicit interfaces for package boundaries.
6. Minimal side effects and testability-first design.

## 13) Testing Strategy

1. Unit tests for domain logic and validation.
2. Integration tests for API + MongoDB.
3. Contract tests for SDK <-> server ingestion.
4. Security tests for signature verification and auth boundaries.
5. Smoke tests for CLI flows.

## 14) MVP Scope (First Implementable Version)

1. Account login via GitHub OAuth.
2. Connect repository and store metadata.
3. Pull and store GitHub clone metrics.
4. Dashboard to display clone count trends.
5. SDK sends anonymous events with project token.
6. Optional claim flow to link GitHub user identity.

## 15) Future Scope

1. GitHub App support for richer installation context.
2. Multi-tenant org support and team roles.
3. Alerting rules (email/webhook).
4. Advanced anomaly detection on clone spikes.
5. Self-host setup automation and Helm/docker templates.

## 16) Known Limitations

1. Exact identity for every clone is impossible without user participation.
2. GitHub traffic APIs have retention and precision limitations.
3. Signal correlation can produce uncertainty; confidence score is mandatory.

## 17) Delivery Plan (After Docs Approval)

1. Initialize monorepo packages and shared TS config.
2. Implement core models + config + validators.
3. Implement framework-free Node server and routing.
4. Implement MongoDB repositories.
5. Implement SDK with signed ingestion.
6. Implement minimal web dashboard.
7. Add tests and developer documentation.

---

This specification intentionally balances your original requirement ("know who cloned") with GitHub platform constraints, while still delivering a practical, reusable, and production-grade system.
