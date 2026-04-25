import { randomBytes } from "node:crypto";

import type { StateStore } from "./types.js";

interface StateValue {
  origin: string;
  expiresAt: number;
}

export class InMemoryStateStore implements StateStore {
  private readonly entries = new Map<string, StateValue>();

  public constructor(private readonly ttlMs: number) {}

  public create(origin: string): string {
    this.cleanup();
    const state = randomBytes(32).toString("base64url");
    this.entries.set(state, {
      origin,
      expiresAt: Date.now() + this.ttlMs,
    });
    return state;
  }

  public consume(state: string): { origin: string } | null {
    this.cleanup();
    const entry = this.entries.get(state);
    if (!entry) {
      return null;
    }
    this.entries.delete(state);
    if (entry.expiresAt < Date.now()) {
      return null;
    }
    return { origin: entry.origin };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.entries.entries()) {
      if (value.expiresAt < now) {
        this.entries.delete(key);
      }
    }
  }
}
