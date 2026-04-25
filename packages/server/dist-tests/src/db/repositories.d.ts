import type { AuditLog, AuditLogRepository, CloneMetric, CloneMetricRepository, EntityId, IdentityClaim, IdentityClaimRepository, Repository, RepositoryRepository, Signal, SignalRepository, User, UserRepository } from "@hunt/core";
import type { MongoCollections } from "./connection.js";
export declare class MongoUserRepository implements UserRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
    findById(id: EntityId): Promise<User | null>;
    findByGithubId(githubId: string): Promise<User | null>;
    update(id: EntityId, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<User>;
}
export declare class MongoRepositoryRepository implements RepositoryRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    create(input: Omit<Repository, "id" | "createdAt" | "updatedAt">): Promise<Repository>;
    findById(id: EntityId): Promise<Repository | null>;
    findByOwnerAndName(owner: string, name: string): Promise<Repository | null>;
    listByOwnerId(ownerId: EntityId, limit: number, cursor?: string): Promise<Repository[]>;
    listForPolling(limit: number, cursor?: string): Promise<Repository[]>;
    update(id: EntityId, patch: Partial<Omit<Repository, "id" | "createdAt">>): Promise<Repository>;
}
export declare class MongoCloneMetricRepository implements CloneMetricRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    insert(metric: Omit<CloneMetric, "id">): Promise<CloneMetric>;
    listByRepository(repositoryId: EntityId, range?: {
        from?: string;
        to?: string;
    }): Promise<CloneMetric[]>;
}
export declare class MongoSignalRepository implements SignalRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    insert(signal: Omit<Signal, "id" | "createdAt">): Promise<Signal>;
    findByIdempotencyKey(idempotencyKey: string): Promise<Signal | null>;
}
export declare class MongoIdentityClaimRepository implements IdentityClaimRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    insert(claim: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">): Promise<IdentityClaim>;
    listByRepository(repositoryId: EntityId, limit: number, cursor?: string): Promise<IdentityClaim[]>;
    updateStatus(id: EntityId, status: IdentityClaim["verificationStatus"]): Promise<IdentityClaim>;
}
export declare class MongoAuditLogRepository implements AuditLogRepository {
    private readonly collections;
    constructor(collections: MongoCollections);
    insert(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog>;
}
export declare function createMongoRepositories(collections: MongoCollections): {
    users: MongoUserRepository;
    repositories: MongoRepositoryRepository;
    cloneMetrics: MongoCloneMetricRepository;
    signals: MongoSignalRepository;
    identityClaims: MongoIdentityClaimRepository;
    auditLogs: MongoAuditLogRepository;
};
//# sourceMappingURL=repositories.d.ts.map