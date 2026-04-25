export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTEGRITY_VIOLATION"
  | "INTERNAL_ERROR";

export interface DomainErrorDetails {
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details?: DomainErrorDetails;

  public constructor(
    code: DomainErrorCode,
    message: string,
    details?: DomainErrorDetails,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}
