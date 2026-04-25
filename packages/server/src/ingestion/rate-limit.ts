import { HttpError } from "../http/errors.js";

interface CounterWindow {
  count: number;
  windowStartMs: number;
}

export class InMemoryRateLimiter {
  private readonly counters = new Map<string, CounterWindow>();

  public constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  public check(key: string): void {
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
