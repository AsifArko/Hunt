import type { StateStore } from "./types.js";
export declare class InMemoryStateStore implements StateStore {
    private readonly ttlMs;
    private readonly entries;
    constructor(ttlMs: number);
    create(origin: string): string;
    consume(state: string): {
        origin: string;
    } | null;
    private cleanup;
}
//# sourceMappingURL=state-store.d.ts.map