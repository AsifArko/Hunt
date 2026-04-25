# TASK-01: Foundation Monorepo Setup

## Goal

Create the initial project structure and tooling baseline for a framework-free Node.js + TypeScript monorepo.

## Scope (only this task)

- Create folder layout:
  - `packages/core`
  - `packages/server`
  - `packages/sdk-node`
  - `packages/cli`
  - `packages/web`
- Create root `package.json` with workspaces.
- Add shared TypeScript config (`tsconfig.base.json`) and per-package tsconfig files.
- Add base scripts for build/test/lint placeholders.
- Add `.gitignore`, `.editorconfig`, and minimal README.

## Out of scope

- No business logic.
- No API routes.
- No MongoDB integration.

## Deliverables

1. Workspace and package manifests are valid.
2. `npm run build` (or equivalent) executes without crashing (even if packages are placeholders).
3. Basic development scripts are documented.

## Acceptance criteria

- Running install and build works on a clean machine.
- Folder structure matches specification.
- No secrets committed.

## Code quality rules (must follow)

- Clean code: keep files small and purpose-specific.
- Configurable code: all tool options controlled by config files, not inline hacks.
- Modular code: each package has its own clear boundary.
- Reusable code: shared compiler/tooling setup lives at root and is reused.

## Suggested commit title

`chore: initialize monorepo foundation and shared tooling`
