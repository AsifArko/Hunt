import type {
  CloneMetric,
  EntityId,
  IdentityClaim,
  Repository,
  RepositorySettings,
  Signal,
} from "./entities.js";

export interface PaginationInput {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  nextCursor?: string;
}

export interface ConnectRepositoryInput {
  owner: string;
  name: string;
  githubRepoId: string;
  defaultBranch: string;
  projectTokenPlaintext: string;
  settings?: Partial<RepositorySettings>;
}

export interface RepositorySummary {
  id: EntityId;
  owner: string;
  name: string;
  defaultBranch: string;
  createdAt: string;
}

export interface UpdateRepositorySettingsInput {
  repositoryId: EntityId;
  settings: Partial<RepositorySettings>;
}

export interface CreateSignalInput {
  repositoryId: EntityId;
  eventType: string;
  eventTimestamp: string;
  sessionId?: string;
  fingerprintHash?: string;
  ipHash?: string;
  userAgentHash?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreateIdentityClaimInput {
  repositoryId: EntityId;
  userId: EntityId;
  claimTimestamp: string;
  proofType: "oauth_challenge" | "signed_message";
  proofPayload: Record<string, string | number | boolean | null>;
}

export interface ListCloneMetricsInput {
  repositoryId: EntityId;
  from?: string;
  to?: string;
}

export interface InsightsResult {
  repositoryId: EntityId;
  recentTotalClones: number;
  recentUniqueCloners: number;
  confidenceBreakdown: Record<"low" | "medium" | "high", number>;
}

export interface RepositoryServiceContract {
  connect(input: ConnectRepositoryInput): Promise<Repository>;
  listForUser(userId: EntityId, pagination?: PaginationInput): Promise<PaginatedResult<RepositorySummary>>;
  getById(repositoryId: EntityId): Promise<Repository>;
  updateSettings(input: UpdateRepositorySettingsInput): Promise<Repository>;
}

export interface SignalServiceContract {
  createSignal(input: CreateSignalInput): Promise<Signal>;
}

export interface ClaimServiceContract {
  createClaim(input: CreateIdentityClaimInput): Promise<IdentityClaim>;
  listClaims(repositoryId: EntityId, pagination?: PaginationInput): Promise<PaginatedResult<IdentityClaim>>;
}

export interface MetricsServiceContract {
  listCloneMetrics(input: ListCloneMetricsInput): Promise<CloneMetric[]>;
  getInsights(repositoryId: EntityId): Promise<InsightsResult>;
}
