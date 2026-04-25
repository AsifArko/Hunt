export type DomainErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "INTEGRITY_VIOLATION" | "INTERNAL_ERROR";
export interface DomainErrorDetails {
    readonly context?: Record<string, unknown>;
    readonly cause?: unknown;
}
export declare class DomainError extends Error {
    readonly code: DomainErrorCode;
    readonly details?: DomainErrorDetails;
    constructor(code: DomainErrorCode, message: string, details?: DomainErrorDetails);
}
//# sourceMappingURL=errors.d.ts.map