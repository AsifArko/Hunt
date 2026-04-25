import { HttpError } from "../http/errors.js";
export class InMemoryRateLimiter {
    maxRequests;
    windowMs;
    counters = new Map();
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    check(key) {
        const now = Date.now();
        const existing = this.counters.get(key);
        if (!existing || now - existing.windowStartMs >= this.windowMs) {
            this.counters.set(key, { count: 1, windowStartMs: now });
            return;
        }
        if (existing.count >= this.maxRequests) {
            throw new HttpError(429, "RATE_LIMITED", "Too many ingestion requests.");
        }
        existing.count += 1;
    }
}
//# sourceMappingURL=rate-limit.js.map