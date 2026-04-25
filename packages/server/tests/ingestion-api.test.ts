import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import type {
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
      throw new Error("user not found");
    }
    const updated: User = { ...existing, ...patch, updatedAt: new Date().toISOString() };
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
    const item: Repository = { id, createdAt: now, updatedAt: now, ...input };
    this.byId.set(id, item);
    return item;
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

  public async listByOwnerId(
    ownerId: string,
    limit: number,
    cursor?: string,
  ): Promise<Repository[]> {
    const items = Array.from(this.byId.values()).filter((repo) => repo.owner === ownerId);
    const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
    return items.slice(start, start + limit);
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

class InMemorySignalRepository implements SignalRepository {
  public readonly byIdempotency = new Map<string, Signal>();
  private readonly byId = new Map<string, Signal>();
  private counter = 0;

  public async insert(signal: Omit<Signal, "id" | "createdAt">): Promise<Signal> {
    const id = `sig_${++this.counter}`;
    const createdAt = new Date().toISOString();
    const item: Signal = { id, createdAt, ...signal };
    this.byId.set(id, item);
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
  private readonly byId = new Map<string, IdentityClaim>();
  private counter = 0;

  public async insert(
    claim: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">,
  ): Promise<IdentityClaim> {
    const id = `claim_${++this.counter}`;
    const now = new Date().toISOString();
    const item: IdentityClaim = { id, createdAt: now, updatedAt: now, ...claim };
    this.byId.set(id, item);
    return item;
  }

  public async listByRepository(repositoryId: string): Promise<IdentityClaim[]> {
    return Array.from(this.byId.values()).filter((claim) => claim.repositoryId === repositoryId);
  }

  public async updateStatus(id: string, status: IdentityClaim["verificationStatus"]): Promise<IdentityClaim> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error("claim not found");
    }
    const updated = { ...existing, verificationStatus: status, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }
}

class MockGithubOAuthClient implements GithubOAuthClient {
  public async exchangeCodeForAccessToken(params: { code: string; redirectUri: string }): Promise<string> {
    return `${params.code}:${params.redirectUri}`;
  }

  public async fetchUserProfile(accessToken: string): Promise<GithubUserProfile> {
    const [code] = accessToken.split(":");
    if (code === "bob") {
      return { id: 2, login: "bob" };
    }
    return { id: 1, login: "alice" };
  }
}

interface TestHandle {
  baseUrl: string;
  close(): Promise<void>;
  repoRepository: InMemoryRepositoryRepository;
  signalRepository: InMemorySignalRepository;
}

async function startServerForIngestion(): Promise<TestHandle> {
  const repoRepository = new InMemoryRepositoryRepository();
  const signalRepository = new InMemorySignalRepository();
  const identityClaimRepository = new InMemoryIdentityClaimRepository();
  const app = createHttpApp({
    config: {
      logging: { level: "error" },
      auth: {
        githubClientId: "test-client-id",
        githubClientSecret: "test-client-secret",
        jwtSecret: "test-jwt-secret",
      },
      ingestion: {
        signatureSecret: "ingestion-secret",
        signatureMaxAgeSeconds: 300,
        maxRequestsPerMinute: 100,
      },
    },
    authDependencies: {
      userRepository: new InMemoryUserRepository(),
      githubOAuthClient: new MockGithubOAuthClient(),
    },
    ingestionDependencies: {
      repositoryRepository: repoRepository,
      signalRepository,
      identityClaimRepository,
    },
  });

  const server: Server = createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("bad address");
  }

  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    repoRepository,
    signalRepository,
    close: () => new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

async function authToken(baseUrl: string, code: "alice" | "bob"): Promise<string> {
  const startResponse = await fetch(`${baseUrl}/auth/github/start`);
  const startBody = (await startResponse.json()) as { authorizeUrl: string };
  const state = new URL(startBody.authorizeUrl).searchParams.get("state");
  assert.ok(state);
  const callbackResponse = await fetch(
    `${baseUrl}/auth/github/callback?code=${code}&state=${state}&response=json`,
  );
  assert.equal(callbackResponse.status, 200);
  const callbackBody = (await callbackResponse.json()) as { token: string };
  return callbackBody.token;
}

test("rejects unsigned signal request", async () => {
  const handle = await startServerForIngestion();
  try {
    const repo = await handle.repoRepository.create({
      owner: "alice",
      name: "hunt",
      githubRepoId: "1",
      defaultBranch: "main",
      projectTokenHash: "hash",
      settings: { privacyMode: "balanced", retentionDays: 30, claimPolicy: "manual_review" },
    });
    const response = await fetch(`${handle.baseUrl}/v1/signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repositoryId: repo.id, eventType: "init" }),
    });
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, 401);
    assert.equal(body.error.code, "INVALID_SIGNATURE");
  } finally {
    await handle.close();
  }
});

test("accepts valid signed signal and replays idempotent request once", async () => {
  const handle = await startServerForIngestion();
  try {
    const repo = await handle.repoRepository.create({
      owner: "alice",
      name: "hunt",
      githubRepoId: "1",
      defaultBranch: "main",
      projectTokenHash: "hash",
      settings: { privacyMode: "balanced", retentionDays: 30, claimPolicy: "manual_review" },
    });

    const payload = {
      repositoryId: repo.id,
      eventType: "integration_initialized",
      eventTimestamp: new Date().toISOString(),
      ip: "127.0.0.1",
      userAgent: "Mozilla",
      metadata: { idempotencyKey: "abc-123", email: "hello@example.com" },
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeSignatureForTesting({
      secret: "ingestion-secret",
      timestamp,
      payload,
    });

    const firstResponse = await fetch(`${handle.baseUrl}/v1/signals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hunt-signature": signature,
        "x-hunt-timestamp": timestamp,
        "idempotency-key": "abc-123",
      },
      body: JSON.stringify(payload),
    });
    const firstBody = (await firstResponse.json()) as {
      signal: Signal;
      idempotentReplay: boolean;
    };
    assert.equal(firstResponse.status, 201);
    assert.equal(firstBody.idempotentReplay, false);
    assert.notEqual(firstBody.signal.metadata.email, "hello@example.com");

    const secondResponse = await fetch(`${handle.baseUrl}/v1/signals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hunt-signature": signature,
        "x-hunt-timestamp": timestamp,
        "idempotency-key": "abc-123",
      },
      body: JSON.stringify(payload),
    });
    const secondBody = (await secondResponse.json()) as {
      signal: Signal;
      idempotentReplay: boolean;
    };
    assert.equal(secondResponse.status, 200);
    assert.equal(secondBody.idempotentReplay, true);
    assert.equal(secondBody.signal.id, firstBody.signal.id);
  } finally {
    await handle.close();
  }
});

test("creates claim for authenticated user", async () => {
  const handle = await startServerForIngestion();
  try {
    const repo = await handle.repoRepository.create({
      owner: "alice",
      name: "hunt",
      githubRepoId: "1",
      defaultBranch: "main",
      projectTokenHash: "hash",
      settings: { privacyMode: "balanced", retentionDays: 30, claimPolicy: "manual_review" },
    });
    const token = await authToken(handle.baseUrl, "alice");
    const response = await fetch(`${handle.baseUrl}/v1/claims`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        repositoryId: repo.id,
        proofType: "oauth_challenge",
        proofPayload: { challenge: "xyz" },
      }),
    });
    const body = (await response.json()) as {
      claim: IdentityClaim;
    };
    assert.equal(response.status, 201);
    assert.equal(body.claim.repositoryId, repo.id);
    assert.equal(body.claim.confidenceLevel, "medium");
    assert.equal(body.claim.verificationStatus, "pending");
  } finally {
    await handle.close();
  }
});
