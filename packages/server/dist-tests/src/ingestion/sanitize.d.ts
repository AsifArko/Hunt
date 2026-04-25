type MetadataValue = string | number | boolean | null;
export declare function sanitizeSignalInput(input: {
    metadata?: Record<string, MetadataValue>;
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
}): {
    metadata: Record<string, MetadataValue>;
    ipHash?: string;
    userAgentHash?: string;
    fingerprintHash?: string;
};
export {};
//# sourceMappingURL=sanitize.d.ts.map