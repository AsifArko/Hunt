export interface CloneIntelClientConfig {
    apiBaseUrl: string;
    repositoryId: string;
    signingSecret: string;
    projectToken?: string;
    retry?: {
        attempts?: number;
        baseDelayMs?: number;
    };
    timeoutMs?: number;
    queue?: {
        enabled: boolean;
        filePath: string;
    };
}
export type EventMetadataValue = string | number | boolean | null;
export interface CaptureEventInput {
    eventTimestamp?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
    metadata?: Record<string, EventMetadataValue>;
}
export interface CloneIntelClient {
    captureEvent(eventType: string, input?: CaptureEventInput): Promise<void>;
    flushQueue(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map