import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import type {
  CloneMetric,
  CloneMetricRepository,
  IdentityClaim,
  IdentityClaimRepository,
  Repository,
  RepositoryRepository,
  Signal,
  SignalRepository,
  User,
  UserRepository,
} from "@hunt/core";

import { createHttpApp } from "../src/http/app.js";
import { computeSignatureForTesting } from "../src/ingestion/signature.js";
import type { GithubOAuthClient, GithubUserProfile } from "../src/auth/types.js";

class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byGithubId = new Map<string, string>();
  private counter = 0;

  public async create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const id = `user_${++this.counter}`;
    const now = new Date().toISOString();
    const user: User = { id, createdAt: now, updatedAt: now, ...input };
    this.byId.set(id, user);
    this.byGithubId.set(user.githubId, id);
    return user;
  }
  public async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  public async findByGithubId(githubId: string): Promise<User | null> {
    const id = this.byGithubId.get(githubId);
    return id ? (this.byId.get(id) ?? null) : null;
  }
  public async update(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<User> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error("User not found");
    }
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }
}

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
    return Array.from(this.byId.values()).filter((repo) => repo.owner === ownerId).slice(0, limit);
  }
  public async listForPolling(limit: number): Promise<Repository[]> {
    return Array.from(this.byId.values()).slice(0, limit);
  }
  public async update(
    id: string,
    patch: Partial<Omit<Repository, "id" | "createdAt">>,
  ): Promise<Repository> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error("Repository not found");
    }
    const updated: Repository = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }
}

class InMemorySignalRepository implements SignalRepository {
  private readonly byIdempotency = new Map<string, Signal>();
  private counter = 0;
  public async insert(signal: Omit<Signal, "id" | "createdAt">): Promise<Signal> {
    const id = `sig_${++this.counter}`;
    const createdAt = new Date().toISOString();
    const item: Signal = { id, createdAt, ...signal };
    const key = signal.metadata.idempotencyKey;
    if (typeof key === "string") {
      this.byIdempotency.set(key, item);
    }
    return item;
  }
  public async findByIdempotencyKey(idempotencyKey: string): Promise<Signal | null> {
    return this.byIdempotency.get(idempotencyKey) ?? null;
  }
}

class InMemoryIdentityClaimRepository implements IdentityClaimRepository {
  public async insert(
    claim: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">,
  ): Promise<IdentityClaim> {
    const now = new Date().toISOString();
    return { id: "claim_1", createdAt: now, updatedAt: now, ...claim };
  }
  public async listByRepository(): Promise<IdentityClaim[]> {
    return [];
  }
  public async updateStatus(): Promise<IdentityClaim> {
    throw new Error("Not implemented");
  }
}

class InMemoryCloneMetricRepository implements CloneMetricRepository {
  public async insert(metric: Omit<CloneMetric, "id">): Promise<CloneMetric> {
    return { id: "metric_1", ...metric };
  }
  public async listByRepository(): Promise<CloneMetric[]> {
    return [];
  }
}

class MockGithubOAuthClient implements GithubOAuthClient {
  public async exchangeCodeForAccessToken(params: {
    code: string;
    redirectUri: string;
  }): Promise<string> {
    return `${params.code}:${params.redirectUri}`;
  }
  public async fetchUserProfile(): Promise<GithubUserProfile> {
    return { id: 1, login: "alice" };
  }
}

test("critical path: auth -> repo connect -> ingestion -> metrics view", async () => {
  const repositoryRepository = new InMemoryRepositoryRepository();
  const app = createHttpApp({
    config: {
      logging: { level: "error" },
      auth: {
        githubClientId: "client-id",
        githubClientSecret: "client-secret",
        jwtSecret: "jwt-secret",
      },
      repositories: { projectTokenBytes: 16 },
      ingestion: { signatureSecret: "ingestion-secret" },
    },
    authDependencies: {
      userRepository: new InMemoryUserRepository(),
      githubOAuthClient: new MockGithubOAuthClient(),
    },
    repositoryDependencies: {
      repositoryRepository,
      cloneMetricRepository: new InMemoryCloneMetricRepository(),
      identityClaimRepository: new InMemoryIdentityClaimRepository(),
    },
    ingestionDependencies: {
      repositoryRepository,
      signalRepository: new InMemorySignalRepository(),
      identityClaimRepository: new InMemoryIdentityClaimRepository(),
    },
  });

  const server: Server = createServer((req, res) => void app.handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Address missing");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const start = await fetch(`${baseUrl}/auth/github/start`);
    const startBody = (await start.json()) as { authorizeUrl: string };
    const state = new URL(startBody.authorizeUrl).searchParams.get("state");
    assert.ok(state);

    const callback = await fetch(
      `${baseUrl}/auth/github/callback?code=good&state=${state}&response=json`,
    );
    const callbackBody = (await callback.json()) as { token: string };
    const token = callbackBody.token;
    assert.ok(token);

    const connectResponse = await fetch(`${baseUrl}/v1/repos/connect`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        owner: "alice",
        name: "hunt",
        githubRepoId: "123",
        defaultBranch: "main",
      }),
    });
    assert.equal(connectResponse.status, 201);
    const connectBody = (await connectResponse.json()) as { repository: { id: string } };

    const signalPayload = {
      repositoryId: connectBody.repository.id,
      eventType: "integration_initialized",
      metadata: { idempotencyKey: "critical-1" },
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeSignatureForTesting({
      secret: "ingestion-secret",
      timestamp,
      payload: signalPayload,
    });
    const ingestResponse = await fetch(`${baseUrl}/v1/signals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hunt-signature": signature,
        "x-hunt-timestamp": timestamp,
        "idempotency-key": "critical-1",
      },
      body: JSON.stringify(signalPayload),
    });
    assert.equal(ingestResponse.status, 201);

    const metricsView = await fetch(
      `${baseUrl}/v1/repos/${connectBody.repository.id}/metrics/clones`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(metricsView.status, 200);
    const metricsBody = (await metricsView.json()) as { items: unknown[] };
    assert.ok(Array.isArray(metricsBody.items));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
