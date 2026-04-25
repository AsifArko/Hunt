import assert from "node:assert/strict";
import test from "node:test";

import type { CloneMetric, CloneMetricRepository, Repository, RepositoryRepository } from "@hunt/core";

import { CloneMetricsPoller } from "../src/metrics/poller.js";
import type { GitCloneTraffic, GitHubTrafficClient } from "../src/metrics/github-traffic-client.js";

class InMemoryRepositoryRepository implements RepositoryRepository {
  private readonly byId = new Map<string, Repository>();
  private counter = 0;

  public async create(input: Omit<Repository, "id" | "createdAt" | "updatedAt">): Promise<Repository> {
    const id = `repo_${++this.counter}`;
    const now = new Date().toISOString();
    const repo: Repository = { id, createdAt: now, updatedAt: now, ...input };
    this.byId.set(id, repo);
    return repo;
  }

  public async findById(id: string): Promise<Repository | null> {
    return this.byId.get(id) ?? null;
  }

  public async findByOwnerAndName(owner: string, name: string): Promise<Repository | null> {
    for (const repo of this.byId.values()) {
      if (repo.owner === owner && repo.name === name) {
        return repo;
      }
    }
    return null;
  }

  public async listByOwnerId(ownerId: string, limit: number): Promise<Repository[]> {
    return Array.from(this.byId.values())
      .filter((repo) => repo.owner === ownerId)
      .slice(0, limit);
  }

  public async listForPolling(limit: number, cursor?: string): Promise<Repository[]> {
    const items = Array.from(this.byId.values());
    const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
    return items.slice(start, start + limit);
  }

  public async update(
    id: string,
    patch: Partial<Omit<Repository, "id" | "createdAt">>,
  ): Promise<Repository> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error("repository not found");
    }
    const updated: Repository = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }
}

class InMemoryCloneMetricRepository implements CloneMetricRepository {
  public readonly items: CloneMetric[] = [];
  private counter = 0;
  private readonly uniqueWindows = new Set<string>();

  public async insert(metric: Omit<CloneMetric, "id">): Promise<CloneMetric> {
    const key = `${metric.repositoryId}:${metric.windowStart}:${metric.windowEnd}:${metric.source}`;
    if (this.uniqueWindows.has(key)) {
      const duplicateError = Object.assign(new Error("duplicate"), { code: 11000 });
      throw duplicateError;
    }
    this.uniqueWindows.add(key);
    const entity: CloneMetric = { id: `metric_${++this.counter}`, ...metric };
    this.items.push(entity);
    return entity;
  }

  public async listByRepository(repositoryId: string): Promise<CloneMetric[]> {
    return this.items.filter((item) => item.repositoryId === repositoryId);
  }
}

class FlakyTrafficClient implements GitHubTrafficClient {
  private failuresLeft = 1;

  public constructor(private readonly data: GitCloneTraffic[]) {}

  public async getCloneTraffic(): Promise<GitCloneTraffic[]> {
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error("temporary github failure");
    }
    return this.data;
  }
}

test("poller stores clone metrics and tolerates duplicate windows", async () => {
  const repositories = new InMemoryRepositoryRepository();
  const metrics = new InMemoryCloneMetricRepository();
  const repo = await repositories.create({
    owner: "alice",
    name: "hunt",
    githubRepoId: "123",
    defaultBranch: "main",
    projectTokenHash: "hash",
    settings: { privacyMode: "balanced", retentionDays: 30, claimPolicy: "manual_review" },
  });

  const trafficClient: GitHubTrafficClient = {
    getCloneTraffic: async () => [
      { timestamp: "2026-04-22T00:00:00Z", count: 10, uniques: 7 },
      { timestamp: "2026-04-23T00:00:00Z", count: 15, uniques: 8 },
    ],
  };

  const poller = new CloneMetricsPoller(
    {
      intervalMs: 1000,
      batchSize: 20,
      retryAttempts: 2,
      retryDelayMs: 1,
    },
    {
      repositoryRepository: repositories,
      cloneMetricRepository: metrics,
      githubTrafficClient: trafficClient,
    },
  );

  await poller.runOnce();
  await poller.runOnce();

  const stored = await metrics.listByRepository(repo.id);
  assert.equal(stored.length, 2);
});

test("poller retries transient github failures", async () => {
  const repositories = new InMemoryRepositoryRepository();
  const metrics = new InMemoryCloneMetricRepository();
  await repositories.create({
    owner: "alice",
    name: "hunt",
    githubRepoId: "123",
    defaultBranch: "main",
    projectTokenHash: "hash",
    settings: { privacyMode: "balanced", retentionDays: 30, claimPolicy: "manual_review" },
  });

  const poller = new CloneMetricsPoller(
    {
      intervalMs: 1000,
      batchSize: 10,
      retryAttempts: 3,
      retryDelayMs: 1,
    },
    {
      repositoryRepository: repositories,
      cloneMetricRepository: metrics,
      githubTrafficClient: new FlakyTrafficClient([
        { timestamp: "2026-04-24T00:00:00Z", count: 12, uniques: 9 },
      ]),
    },
  );

  await poller.runOnce();

  assert.equal(metrics.items.length, 1);
  assert.equal(metrics.items[0]?.totalClones, 12);
});
