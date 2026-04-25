import type { AuditLog, CloneMetric, EntityId, IdentityClaim, Repository, Signal, User } from "./entities.js";
export interface UserRepository {
    create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
    findById(id: EntityId): Promise<User | null>;
    findByGithubId(githubId: string): Promise<User | null>;
    update(id: EntityId, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<User>;
}
export interface RepositoryRepository {
    create(input: Omit<Repository, "id" | "createdAt" | "updatedAt">): Promise<Repository>;
    findById(id: EntityId): Promise<Repository | null>;
    findByOwnerAndName(owner: string, name: string): Promise<Repository | null>;
    listByOwnerId(ownerId: EntityId, limit: number, cursor?: string): Promise<Repository[]>;
    update(id: EntityId, patch: Partial<Omit<Repository, "id" | "createdAt">>): Promise<Repository>;
}
export interface CloneMetricRepository {
    insert(metric: Omit<CloneMetric, "id">): Promise<CloneMetric>;
    listByRepository(repositoryId: EntityId, range?: {
        from?: string;
        to?: string;
    }): Promise<CloneMetric[]>;
}
export interface SignalRepository {
    insert(signal: Omit<Signal, "id" | "createdAt">): Promise<Signal>;
    findByIdempotencyKey(idempotencyKey: string): Promise<Signal | null>;
}
export interface IdentityClaimRepository {
    insert(claim: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">): Promise<IdentityClaim>;
    listByRepository(repositoryId: EntityId, limit: number, cursor?: string): Promise<IdentityClaim[]>;
    updateStatus(id: EntityId, status: IdentityClaim["verificationStatus"]): Promise<IdentityClaim>;
}
export interface AuditLogRepository {
    insert(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog>;
}
//# sourceMappingURL=repositories.d.ts.map