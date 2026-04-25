import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import type { Repository, RepositoryRepository, User, UserRepository } from "@hunt/core";

import { createHttpApp } from "../src/http/app.js";
import { hashProjectToken } from "../src/repos/token.js";
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
      throw new Error(`User not found: ${id}`);
    }
    const updated: User = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(id, updated);
    return updated;
  }
}

class InMemoryRepositoryRepository implements RepositoryRepository {
  private readonly byId = new Map<string, Repository>();
  private counter = 0;

  public async create(
    input: Omit<Repository, "id" | "createdAt" | "updatedAt">,
  ): Promise<Repository> {
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

  public async listByOwnerId(
    ownerId: string,
    limit: number,
    cursor?: string,
  ): Promise<Repository[]> {
    const all = Array.from(this.byId.values()).filter((repo) => repo.owner === ownerId);
    const startIndex = cursor ? all.findIndex((repo) => repo.id === cursor) + 1 : 0;
    return all.slice(startIndex, startIndex + limit);
  }

  public async listForPolling(limit: number, cursor?: string): Promise<Repository[]> {
    const all = Array.from(this.byId.values());
    const startIndex = cursor ? all.findIndex((repo) => repo.id === cursor) + 1 : 0;
    return all.slice(startIndex, startIndex + limit);
  }

  public async update(
    id: string,
    patch: Partial<Omit<Repository, "id" | "createdAt">>,
  ): Promise<Repository> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Repository not found: ${id}`);
    }
    const updated: Repository = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(id, updated);
    return updated;
  }
}

class MockGithubOAuthClient implements GithubOAuthClient {
  public async exchangeCodeForAccessToken(params: {
    code: string;
    redirectUri: string;
  }): Promise<string> {
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

interface TestServerHandle {
  server: Server;
  baseUrl: string;
  repositoryRepository: InMemoryRepositoryRepository;
  close(): Promise<void>;
}

async function startRepoApiServer(): Promise<TestServerHandle> {
  const repositoryRepository = new InMemoryRepositoryRepository();
  const app = createHttpApp({
    config: {
      logging: { level: "error" },
      auth: {
        githubClientId: "test-client-id",
        githubClientSecret: "test-client-secret",
        jwtSecret: "test-jwt-secret",
        oauthScopes: ["read:user"],
      },
      repositories: {
        projectTokenBytes: 16,
      },
    },
    authDependencies: {
      userRepository: new InMemoryUserRepository(),
      githubOAuthClient: new MockGithubOAuthClient(),
    },
    repositoryDependencies: {
      repositoryRepository,
    },
  });

  const server = createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address.");
  }

  return {
    server,
    repositoryRepository,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
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

test("repository routes require authentication", async () => {
  const handle = await startRepoApiServer();
  try {
    const response = await fetch(`${handle.baseUrl}/v1/repos`);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHORIZED");
  } finally {
    await handle.close();
  }
});

test("connect/list/get/update repository with owner checks", async () => {
  const handle = await startRepoApiServer();
  try {
    const aliceToken = await authToken(handle.baseUrl, "alice");
    const connectResponse = await fetch(`${handle.baseUrl}/v1/repos/connect`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        owner: "alice",
        name: "hunt",
        githubRepoId: "12345",
        defaultBranch: "main",
      }),
    });
    const connectBody = (await connectResponse.json()) as {
      projectToken: string;
      repository: { id: string; owner: string; name: string };
    };

    assert.equal(connectResponse.status, 201);
    assert.equal(connectBody.repository.owner, "alice");
    assert.ok(connectBody.projectToken);

    const stored = await handle.repositoryRepository.findById(connectBody.repository.id);
    assert.ok(stored);
    assert.notEqual(stored.projectTokenHash, connectBody.projectToken);
    assert.equal(stored.projectTokenHash, hashProjectToken(connectBody.projectToken));

    const listResponse = await fetch(`${handle.baseUrl}/v1/repos`, {
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const listBody = (await listResponse.json()) as {
      items: Array<{ id: string; name: string }>;
    };
    assert.equal(listResponse.status, 200);
    assert.equal(listBody.items.length, 1);
    assert.equal(listBody.items[0]?.id, connectBody.repository.id);

    const getResponse = await fetch(
      `${handle.baseUrl}/v1/repos/${connectBody.repository.id}`,
      { headers: { authorization: `Bearer ${aliceToken}` } },
    );
    assert.equal(getResponse.status, 200);

    const patchResponse = await fetch(
      `${handle.baseUrl}/v1/repos/${connectBody.repository.id}/settings`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${aliceToken}`,
        },
        body: JSON.stringify({ retentionDays: 90 }),
      },
    );
    const patchBody = (await patchResponse.json()) as {
      repository: { settings: { retentionDays: number } };
    };
    assert.equal(patchResponse.status, 200);
    assert.equal(patchBody.repository.settings.retentionDays, 90);

    const bobToken = await authToken(handle.baseUrl, "bob");
    const forbiddenGet = await fetch(
      `${handle.baseUrl}/v1/repos/${connectBody.repository.id}`,
      { headers: { authorization: `Bearer ${bobToken}` } },
    );
    assert.equal(forbiddenGet.status, 403);

    const forbiddenPatch = await fetch(
      `${handle.baseUrl}/v1/repos/${connectBody.repository.id}/settings`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bobToken}`,
        },
        body: JSON.stringify({ retentionDays: 120 }),
      },
    );
    assert.equal(forbiddenPatch.status, 403);
  } finally {
    await handle.close();
  }
});
