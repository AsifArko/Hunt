import { randomUUID } from "node:crypto";
import { FileBackedQueue } from "./queue.js";
import { signPayload } from "./signer.js";
import { postWithRetry } from "./transport.js";
function normalizeBaseUrl(url) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}
export class NodeCloneIntelClient {
    config;
    baseUrl;
    queue;
    timeoutMs;
    attempts;
    baseDelayMs;
    constructor(config) {
        this.config = config;
        this.baseUrl = normalizeBaseUrl(config.apiBaseUrl);
        this.timeoutMs = config.timeoutMs ?? 5000;
        this.attempts = config.retry?.attempts ?? 3;
        this.baseDelayMs = config.retry?.baseDelayMs ?? 250;
        if (config.queue?.enabled) {
            this.queue = new FileBackedQueue(config.queue.filePath);
        }
    }
    async captureEvent(eventType, input = {}) {
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
        const headers = {
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
        }
        catch (error) {
            if (!this.queue) {
                throw error;
            }
            await this.queue.enqueue({ payload, headers });
        }
    }
    async flushQueue() {
        if (!this.queue) {
            return;
        }
        await this.queue.flush((item) => this.send(item.payload, item.headers));
    }
    async send(payload, headers) {
        await postWithRetry({
            url: `${this.baseUrl}/v1/signals`,
            payload,
            headers,
            timeoutMs: this.timeoutMs,
        }, {
            attempts: this.attempts,
            baseDelayMs: this.baseDelayMs,
        });
    }
}
export function createCloneIntelClient(config) {
    return new NodeCloneIntelClient(config);
}
//# sourceMappingURL=client.js.map