import { randomUUID } from "node:crypto";

import { FileBackedQueue } from "./queue.js";
import { signPayload } from "./signer.js";
import { postWithRetry } from "./transport.js";
import type {
  CaptureEventInput,
  CloneIntelClient,
  CloneIntelClientConfig,
} from "./types.js";

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export class NodeCloneIntelClient implements CloneIntelClient {
  private readonly baseUrl: string;
  private readonly queue?: FileBackedQueue;
  private readonly timeoutMs: number;
  private readonly attempts: number;
  private readonly baseDelayMs: number;

  public constructor(private readonly config: CloneIntelClientConfig) {
    this.baseUrl = normalizeBaseUrl(config.apiBaseUrl);
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.attempts = config.retry?.attempts ?? 3;
    this.baseDelayMs = config.retry?.baseDelayMs ?? 250;
    if (config.queue?.enabled) {
      this.queue = new FileBackedQueue(config.queue.filePath);
    }
  }

  public async captureEvent(
    eventType: string,
    input: CaptureEventInput = {},
  ): Promise<void> {
    const payload = {
      repositoryId: this.config.repositoryId,
      eventType,
      eventTimestamp: input.eventTimestamp ?? new Date().toISOString(),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.ip ? { ip: input.ip } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.fingerprint ? { fingerprint: input.fingerprint } : {}),
      metadata: input.metadata ?? {},
    };

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signPayload({
      payload,
      timestamp,
      secret: this.config.signingSecret,
    });
    const idempotencyKey = randomUUID();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-hunt-signature": signature,
      "x-hunt-timestamp": timestamp,
      "idempotency-key": idempotencyKey,
    };
    if (this.config.projectToken) {
      headers["x-hunt-project-token"] = this.config.projectToken;
    }

    try {
      await this.send(payload, headers);
    } catch (error) {
      if (!this.queue) {
        throw error;
      }
      await this.queue.enqueue({ payload, headers });
    }
  }

  public async flushQueue(): Promise<void> {
    if (!this.queue) {
      return;
    }
    await this.queue.flush((item) => this.send(item.payload, item.headers));
  }

  private async send(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    await postWithRetry(
      {
        url: `${this.baseUrl}/v1/signals`,
        payload,
        headers,
        timeoutMs: this.timeoutMs,
      },
      {
        attempts: this.attempts,
        baseDelayMs: this.baseDelayMs,
      },
    );
  }
}

export function createCloneIntelClient(
  config: CloneIntelClientConfig,
): CloneIntelClient {
  return new NodeCloneIntelClient(config);
}
