export interface TransportRequest {
    url: string;
    payload: unknown;
    headers: Record<string, string>;
    timeoutMs: number;
}
export interface TransportOptions {
    attempts: number;
    baseDelayMs: number;
}
export declare function postWithRetry(request: TransportRequest, options: TransportOptions): Promise<void>;
//# sourceMappingURL=transport.d.ts.map