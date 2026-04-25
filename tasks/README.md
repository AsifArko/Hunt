# Project Task Sequence

This folder contains small, sequential, implementation-ready tasks derived from `docs/SPECIFICATION.md`.

## How to use

1. Pick tasks in order (`TASK-01`, `TASK-02`, ...).
2. Implement one task per chat/context.
3. Do not start the next task until acceptance criteria of the current task is complete.

## Task order

1. `TASK-01-foundation-monorepo-setup.md`
2. `TASK-02-core-config-and-env-validation.md`
3. `TASK-03-core-domain-models-and-contracts.md`
4. `TASK-04-server-http-router-and-middleware-basics.md`
5. `TASK-05-mongodb-connection-and-repository-layer.md`
6. `TASK-06-auth-github-oauth-minimal-flow.md`
7. `TASK-07-repository-management-api.md`
8. `TASK-08-signal-ingestion-and-signature-verification.md`
9. `TASK-09-clone-metrics-poller-and-storage.md`
10. `TASK-10-dashboard-vanilla-web-ui.md`
11. `TASK-11-sdk-node-minimal-client.md`
12. `TASK-12-hardening-tests-and-release-readiness.md`

## Definition of done (global)

- The task is complete, runs, and has no known blocking bug in scope.
- Code follows the quality rules included in each task file.
- Configuration values are externalized (no hardcoded secrets).
- The task is documented with clear run/test instructions.
