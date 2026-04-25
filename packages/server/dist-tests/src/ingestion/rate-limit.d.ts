export declare class InMemoryRateLimiter {
    private readonly maxRequests;
    private readonly windowMs;
    private readonly counters;
    constructor(maxRequests: number, windowMs: number);
    check(key: string): void;
}
//# sourceMappingURL=rate-limit.d.ts.map