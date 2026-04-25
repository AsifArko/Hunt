export const CORE_PACKAGE_NAME = "@hunt/core";
export { ConfigValidationError, loadConfig } from "./config.js";
export type { HuntConfig } from "./config.js";
export { DomainError } from "./domain/errors.js";
export type { DomainErrorCode, DomainErrorDetails } from "./domain/errors.js";
export type {
  AuditLog,
  CloneMetric,
  CloneMetricSource,
  ConfidenceLevel,
  EntityId,
  ISO8601DateTime,
  IdentityClaim,
  Repository,
  RepositorySettings,
  Signal,
  User,
  VerificationStatus,
} from "./domain/entities.js";
export type {
  ClaimServiceContract,
  ConnectRepositoryInput,
  CreateIdentityClaimInput,
  CreateSignalInput,
  InsightsResult,
  ListCloneMetricsInput,
  MetricsServiceContract,
  PaginatedResult,
  PaginationInput,
  RepositoryServiceContract,
  RepositorySummary,
  SignalServiceContract,
  UpdateRepositorySettingsInput,
} from "./domain/contracts.js";
export type {
  AuditLogRepository,
  CloneMetricRepository,
  IdentityClaimRepository,
  RepositoryRepository,
  SignalRepository,
  UserRepository,
} from "./domain/repositories.js";
export {
  validateConnectRepositoryInput,
  validateCreateIdentityClaimInput,
  validateCreateSignalInput,
  validateUpdateRepositorySettingsInput,
} from "./domain/validation.js";
