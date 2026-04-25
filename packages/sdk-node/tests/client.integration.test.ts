import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { createCloneIntelClient } from "../src/client.js";
import { signPayload } from "../src/signer.js";

interface CapturedRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

async function startSignalServer(params: {
  secret: string;
  failFirst?: boolean;
}): Promise<{
  baseUrl: string;
  captured: CapturedRequest[];
  close(): Promise<void>;
}> {
  const captured: CapturedRequest[] = [];
  let shouldFail = Boolean(params.failFirst);
  const server: Server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/signals") {
      res.statusCode = 404;
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as unknown;
    const signatureHeader = req.headers["x-hunt-signature"];
    const timestampHeader = req.headers["x-hunt-timestamp"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    const timestamp = Array.isArray(timestampHeader)
      ? timestampHeader[0]
      : timestampHeader;

    if (!signature || !timestamp) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { message: "Missing signature headers" } }));
      return;
    }

    const expected = signPayload({
      payload: body,
      timestamp,
      secret: params.secret,
    });
    if (expected !== signature) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { message: "Invalid signature" } }));
      return;
    }

    captured.push({ headers: req.headers, body });
    if (shouldFail) {
      shouldFail = false;
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: { message: "Temporary failure" } }));
      return;
    }

    res.statusCode = 201;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve signal server address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    captured,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test("SDK captures and sends signed event payload", async () => {
  const secret = "sdk-signing-secret";
  const server = await startSignalServer({ secret });
  try {
    const client = createCloneIntelClient({
      apiBaseUrl: server.baseUrl,
      repositoryId: "repo_123",
      signingSecret: secret,
      retry: { attempts: 2, baseDelayMs: 10 },
      timeoutMs: 2_000,
    });

    await client.captureEvent("integration_initialized", {
      sessionId: "session_1",
      metadata: { source: "test" },
    });

    assert.equal(server.captured.length, 1);
    const captured = server.captured[0];
    const body = captured?.body as {
      repositoryId: string;
      eventType: string;
      sessionId?: string;
      metadata: Record<string, unknown>;
    };
    assert.equal(body.repositoryId, "repo_123");
    assert.equal(body.eventType, "integration_initialized");
    assert.equal(body.sessionId, "session_1");
    assert.equal(body.metadata.source, "test");
  } finally {
    await server.close();
  }
});

test("SDK queues failed event and flushes later", async () => {
  const secret = "sdk-signing-secret";
  const tempDir = await mkdtemp(join(tmpdir(), "hunt-sdk-queue-"));
  const queuePath = join(tempDir, "queue.json");
  const server = await startSignalServer({ secret, failFirst: true });

  try {
    const client = createCloneIntelClient({
      apiBaseUrl: server.baseUrl,
      repositoryId: "repo_123",
      signingSecret: secret,
      retry: { attempts: 1, baseDelayMs: 1 },
      timeoutMs: 2_000,
      queue: {
        enabled: true,
        filePath: queuePath,
      },
    });

    await client.captureEvent("queued_event", {
      metadata: { reason: "network_failure" },
    });

    const queueRaw = await readFile(queuePath, "utf-8");
    const queue = JSON.parse(queueRaw) as unknown[];
    assert.equal(queue.length, 1);

    await client.flushQueue();

    const queueAfterRaw = await readFile(queuePath, "utf-8");
    const queueAfter = JSON.parse(queueAfterRaw) as unknown[];
    assert.equal(queueAfter.length, 0);
    assert.equal(server.captured.length, 2);
  } finally {
    await server.close();
  }
});
