export type EntityId = string;
export type ISO8601DateTime = string;
export type ConfidenceLevel = "low" | "medium" | "high";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type CloneMetricSource = "github_traffic_api";
export interface User {
    id: EntityId;
    githubId: string;
    username: string;
    avatarUrl?: string;
    oauthScopes: string[];
    createdAt: ISO8601DateTime;
    updatedAt: ISO8601DateTime;
}
export interface RepositorySettings {
    privacyMode: "strict" | "balanced";
    retentionDays: number;
    claimPolicy: "manual_review" | "auto_review";
}
export interface Repository {
    id: EntityId;
    owner: string;
    name: string;
    githubRepoId: string;
    defaultBranch: string;
    projectTokenHash: string;
    settings: RepositorySettings;
    createdAt: ISO8601DateTime;
    updatedAt: ISO8601DateTime;
}
export interface CloneMetric {
    id: EntityId;
    repositoryId: EntityId;
    windowStart: ISO8601DateTime;
    windowEnd: ISO8601DateTime;
    totalClones: number;
    uniqueCloners: number;
    source: CloneMetricSource;
    collectedAt: ISO8601DateTime;
}
export interface Signal {
    id: EntityId;
    repositoryId: EntityId;
    eventType: string;
    eventTimestamp: ISO8601DateTime;
    sessionId?: string;
    fingerprintHash?: string;
    ipHash?: string;
    userAgentHash?: string;
    metadata: Record<string, string | number | boolean | null>;
    createdAt: ISO8601DateTime;
}
export interface IdentityClaim {
    id: EntityId;
    repositoryId: EntityId;
    userId: EntityId;
    claimTimestamp: ISO8601DateTime;
    proofType: "oauth_challenge" | "signed_message";
    proofPayload: Record<string, string | number | boolean | null>;
    confidenceLevel: ConfidenceLevel;
    verificationStatus: VerificationStatus;
    createdAt: ISO8601DateTime;
    updatedAt: ISO8601DateTime;
}
export interface AuditLog {
    id: EntityId;
    actorUserId?: EntityId;
    repositoryId?: EntityId;
    action: string;
    targetType: string;
    targetId?: EntityId;
    metadata: Record<string, string | number | boolean | null>;
    createdAt: ISO8601DateTime;
}
//# sourceMappingURL=entities.d.ts.map