# @hunt/sdk-node

Node.js SDK for sending signed clone intelligence events to Hunt.

## Install (workspace/local)

This package is part of the Hunt monorepo and built with:

```bash
npm run build --workspace @hunt/sdk-node
```

## Quick start

```ts
import { createCloneIntelClient } from "@hunt/sdk-node";

const client = createCloneIntelClient({
  apiBaseUrl: "http://localhost:4000",
  repositoryId: "repo_123",
  signingSecret: process.env.HUNT_SIGNING_SECRET ?? "",
  projectToken: process.env.HUNT_PROJECT_TOKEN,
  retry: {
    attempts: 3,
    baseDelayMs: 250,
  },
  timeoutMs: 5000,
});

await client.captureEvent("integration_initialized", {
  sessionId: "session_1",
  metadata: { source: "postinstall" },
});
```

## Optional file-backed queue

```ts
const client = createCloneIntelClient({
  apiBaseUrl: "http://localhost:4000",
  repositoryId: "repo_123",
  signingSecret: process.env.HUNT_SIGNING_SECRET ?? "",
  queue: {
    enabled: true,
    filePath: ".hunt/queue.json",
  },
});

await client.captureEvent("event_name");
await client.flushQueue();
```

## Public API

- `createCloneIntelClient(config)`
- `captureEvent(eventType, input?)`
- `flushQueue()`
