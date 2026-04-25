import type { IncomingMessage, ServerResponse } from "node:http";
import type { UserRepository } from "@hunt/core";
import type { GithubOAuthClient } from "../auth/types.js";
import { Router } from "./router.js";
import type { LogLevel, Logger } from "./types.js";
import type { CloneMetricRepository, IdentityClaimRepository, RepositoryRepository, SignalRepository } from "@hunt/core";
export interface AppConfig {
    logging: {
        level: LogLevel;
    };
    auth?: {
        githubClientId: string;
        githubClientSecret: string;
        jwtSecret: string;
        oauthScopes?: string[];
        stateTtlMs?: number;
        jwtExpiresInSeconds?: number;
    };
    repositories?: {
        projectTokenBytes?: number;
    };
    ingestion?: {
        signatureSecret: string;
        signatureMaxAgeSeconds?: number;
        maxRequestsPerMinute?: number;
    };
    http?: {
        maxBodyBytes?: number;
    };
}
export interface HttpAppOptions {
    config: AppConfig;
    logger?: Logger;
    router?: Router;
    authDependencies?: {
        userRepository: UserRepository;
        githubOAuthClient?: GithubOAuthClient;
    };
    repositoryDependencies?: {
        repositoryRepository: RepositoryRepository;
        cloneMetricRepository?: CloneMetricRepository;
        identityClaimRepository?: IdentityClaimRepository;
    };
    ingestionDependencies?: {
        repositoryRepository: RepositoryRepository;
        signalRepository: SignalRepository;
        identityClaimRepository: IdentityClaimRepository;
    };
}
export interface HttpApp {
    router: Router;
    handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
export declare function createHttpApp(options: HttpAppOptions): HttpApp;
//# sourceMappingURL=app.d.ts.map