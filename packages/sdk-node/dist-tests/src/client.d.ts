import type { CaptureEventInput, CloneIntelClient, CloneIntelClientConfig } from "./types.js";
export declare class NodeCloneIntelClient implements CloneIntelClient {
    private readonly config;
    private readonly baseUrl;
    private readonly queue?;
    private readonly timeoutMs;
    private readonly attempts;
    private readonly baseDelayMs;
    constructor(config: CloneIntelClientConfig);
    captureEvent(eventType: string, input?: CaptureEventInput): Promise<void>;
    flushQueue(): Promise<void>;
    private send;
}
export declare function createCloneIntelClient(config: CloneIntelClientConfig): CloneIntelClient;
//# sourceMappingURL=client.d.ts.map