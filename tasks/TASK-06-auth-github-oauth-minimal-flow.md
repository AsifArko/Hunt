# TASK-06: Auth - GitHub OAuth Minimal Flow

## Goal

Implement minimal GitHub OAuth login for repository owners.

## Scope (only this task)

- Add endpoints:
  - `GET /auth/github/start`
  - `GET /auth/github/callback`
- Implement secure `state` generation and validation.
- Exchange OAuth code for access token.
- Fetch basic GitHub profile and upsert user.
- Issue local session/JWT for authenticated requests.

## Out of scope

- No org/team roles.
- No advanced permission management.

## Deliverables

1. End-to-end login flow with callback handling.
2. Session/JWT utility and auth guard middleware.
3. Tests for auth happy path and failure modes.

## Acceptance criteria

- Invalid `state` is rejected.
- User can authenticate and receive valid local auth token.
- Tokens/secrets are never logged.

## Code quality rules (must follow)

- Clean code: separate OAuth provider client from auth service logic.
- Configurable code: OAuth URLs/scopes come from config constants.
- Modular code: auth middleware independent of repository domain logic.
- Reusable code: token and state helpers usable by other providers later.

## Suggested commit title

`feat(auth): add github oauth login and local session issuance`
