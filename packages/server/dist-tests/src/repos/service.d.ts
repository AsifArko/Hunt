import type { AuthenticatedUser } from "../auth/types.js";
import type { CloneMetricRepository, IdentityClaimRepository, RepositoryRepository } from "@hunt/core";
import { type RepositoryResponse } from "./serializers.js";
interface RepositoryServiceOptions {
    repositoryRepository: RepositoryRepository;
    cloneMetricRepository?: CloneMetricRepository;
    identityClaimRepository?: IdentityClaimRepository;
    projectTokenBytes: number;
}
export declare class RepositoryService {
    private readonly options;
    constructor(options: RepositoryServiceOptions);
    connect(actor: AuthenticatedUser, payload: unknown): Promise<{
        repository: RepositoryResponse;
        projectToken: string;
    }>;
    list(actor: AuthenticatedUser): Promise<RepositoryResponse[]>;
    getById(actor: AuthenticatedUser, repoId: string): Promise<RepositoryResponse>;
    updateSettings(actor: AuthenticatedUser, repoId: string, payload: unknown): Promise<RepositoryResponse>;
    listCloneMetrics(actor: AuthenticatedUser, repoId: string): Promise<Array<{
        id: string;
        windowStart: string;
        windowEnd: string;
        totalClones: number;
        uniqueCloners: number;
        source: string;
        collectedAt: string;
    }>>;
    listClaims(actor: AuthenticatedUser, repoId: string): Promise<Array<{
        id: string;
        repositoryId: string;
        userId: string;
        claimTimestamp: string;
        proofType: string;
        confidenceLevel: string;
        verificationStatus: string;
        createdAt: string;
        updatedAt: string;
    }>>;
}
export {};
//# sourceMappingURL=service.d.ts.map