import type { CloneMetricRepository, RepositoryRepository } from "@hunt/core";
import type { GitHubTrafficClient } from "./github-traffic-client.js";
export interface CloneMetricsPollerOptions {
    intervalMs: number;
    batchSize: number;
    retryAttempts: number;
    retryDelayMs: number;
}
interface PollerDependencies {
    repositoryRepository: RepositoryRepository;
    cloneMetricRepository: CloneMetricRepository;
    githubTrafficClient: GitHubTrafficClient;
}
export declare class CloneMetricsPoller {
    private readonly options;
    private readonly deps;
    private timer;
    private running;
    constructor(options: CloneMetricsPollerOptions, deps: PollerDependencies);
    start(): void;
    stop(): void;
    runOnce(): Promise<void>;
    private pollRepository;
    private fetchWithRetry;
}
export {};
//# sourceMappingURL=poller.d.ts.map