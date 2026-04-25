import type { IdentityClaimRepository, RepositoryRepository, SignalRepository } from "@hunt/core";
import type { AuthenticatedUser } from "../auth/types.js";
interface IngestionConfig {
    signatureSecret: string;
    signatureMaxAgeSeconds: number;
    maxRequestsPerMinute: number;
}
interface IngestionDependencies {
    repositoryRepository: RepositoryRepository;
    signalRepository: SignalRepository;
    identityClaimRepository: IdentityClaimRepository;
}
export declare class IngestionService {
    private readonly config;
    private readonly deps;
    private readonly signatureVerifier;
    private readonly rateLimiter;
    constructor(config: IngestionConfig, deps: IngestionDependencies);
    ingestSignal(params: {
        payload: unknown;
        signature: string | undefined;
        timestamp: string | undefined;
        idempotencyKey: string | undefined;
    }): Promise<{
        signal: unknown;
        idempotentReplay: boolean;
    }>;
    createClaim(actor: AuthenticatedUser, payload: unknown): Promise<unknown>;
}
export {};
//# sourceMappingURL=service.d.ts.map