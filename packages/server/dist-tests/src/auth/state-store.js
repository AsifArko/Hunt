import { randomBytes } from "node:crypto";
export class InMemoryStateStore {
    ttlMs;
    entries = new Map();
    constructor(ttlMs) {
        this.ttlMs = ttlMs;
    }
    create(origin) {
        this.cleanup();
        const state = randomBytes(32).toString("base64url");
        this.entries.set(state, {
            origin,
            expiresAt: Date.now() + this.ttlMs,
        });
        return state;
    }
    consume(state) {
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
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.entries.entries()) {
            if (value.expiresAt < now) {
                this.entries.delete(key);
            }
        }
    }
}
//# sourceMappingURL=state-store.js.map