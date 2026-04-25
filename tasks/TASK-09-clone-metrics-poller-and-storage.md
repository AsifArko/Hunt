# TASK-09: Clone Metrics Poller and Storage

## Goal

Implement background job to fetch clone traffic metrics from GitHub API and persist time-series metrics.

## Scope (only this task)

- Create poller service with scheduled execution.
- Integrate GitHub API client for traffic clone endpoint.
- Persist normalized metric snapshots in `clone_metrics`.
- Add deduplication/window handling for repeated poll runs.

## Out of scope

- No final insight scoring yet.
- No UI chart rendering.

## Deliverables

1. Poller service with interval configuration.
2. GitHub API error/retry handling.
3. Tests with mocked GitHub responses.

## Acceptance criteria

- Metrics are stored for connected repositories.
- Poller survives transient GitHub API failures (retry/backoff).
- Duplicate data for same window is not multiplied.

## Code quality rules (must follow)

- Clean code: isolate scheduler, client, and persistence components.
- Configurable code: interval, batch size, and retry policy configurable.
- Modular code: poller logic not tied to HTTP route lifecycle.
- Reusable code: GitHub client abstractions reusable for future endpoints.

## Suggested commit title

`feat(metrics): add github clone traffic poller and storage pipeline`
