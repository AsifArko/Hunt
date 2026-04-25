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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export class CloneMetricsPoller {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  public constructor(
    private readonly options: CloneMetricsPollerOptions,
    private readonly deps: PollerDependencies,
  ) {}

  public start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.options.intervalMs);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  public async runOnce(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      let cursor: string | undefined;
      while (true) {
        const repos = await this.deps.repositoryRepository.listForPolling(
          this.options.batchSize,
          cursor,
        );
        if (repos.length === 0) {
          break;
        }

        for (const repo of repos) {
          await this.pollRepository(repo.owner, repo.name, repo.id);
        }

        if (repos.length < this.options.batchSize) {
          break;
        }
        const last = repos[repos.length - 1];
        cursor = last?.id;
      }
    } finally {
      this.running = false;
    }
  }

  private async pollRepository(
    owner: string,
    name: string,
    repositoryId: string,
  ): Promise<void> {
    const clones = await this.fetchWithRetry(owner, name);
    for (const clone of clones) {
      try {
        await this.deps.cloneMetricRepository.insert({
          repositoryId,
          windowStart: clone.timestamp,
          windowEnd: clone.timestamp,
          totalClones: clone.count,
          uniqueCloners: clone.uniques,
          source: "github_traffic_api",
          collectedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
      }
    }
  }

  private async fetchWithRetry(owner: string, repo: string) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt += 1) {
      try {
        return await this.deps.githubTrafficClient.getCloneTraffic(owner, repo);
      } catch (error) {
        lastError = error;
        if (attempt < this.options.retryAttempts) {
          await sleep(this.options.retryDelayMs * attempt);
        }
      }
    }
    throw lastError;
  }
}
