import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import type { User, UserRepository } from "@hunt/core";

import { createHttpApp } from "../src/http/app.js";
import type { GithubOAuthClient } from "../src/auth/types.js";

class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byGithubId = new Map<string, string>();
  private counter = 0;

  public async create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const id = `user_${++this.counter}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.byId.set(id, user);
    this.byGithubId.set(user.githubId, id);
    return user;
  }

  public async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  public async findByGithubId(githubId: string): Promise<User | null> {
    const id = this.byGithubId.get(githubId);
    if (!id) {
      return null;
    }
    return this.byId.get(id) ?? null;
  }

  public async update(
    id: string,
    patch: Partial<Omit<User, "id" | "createdAt">>,
  ): Promise<User> {
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

class MockGithubOAuthClient implements GithubOAuthClient {
  public async exchangeCodeForAccessToken(params: {
    code: string;
    redirectUri: string;
  }): Promise<string> {
    if (params.code === "bad-code") {
      throw new Error("bad oauth code");
    }
    return `token-${params.redirectUri}`;
  }

  public async fetchUserProfile(): Promise<{ id: number; login: string; avatar_url?: string }> {
    return {
      id: 42,
      login: "asifarko",
      avatar_url: "https://example.com/avatar.png",
    };
  }
}

interface TestServerHandle {
  server: Server;
  baseUrl: string;
  close(): Promise<void>;
}

async function startAuthTestServer(): Promise<TestServerHandle> {
  const app = createHttpApp({
    config: {
      logging: { level: "error" },
      auth: {
        githubClientId: "test-client-id",
        githubClientSecret: "test-client-secret",
        jwtSecret: "test-jwt-secret",
        oauthScopes: ["read:user"],
      },
    },
    authDependencies: {
      userRepository: new InMemoryUserRepository(),
      githubOAuthClient: new MockGithubOAuthClient(),
    },
  });

  const server = createServer((req, res) => {
    void app.handle(req, res);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to read server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

test("GET /auth/github/start returns authorize url with state", async () => {
  const handle = await startAuthTestServer();
  try {
    const response = await fetch(`${handle.baseUrl}/auth/github/start`);
    const body = (await response.json()) as { authorizeUrl: string };

    assert.equal(response.status, 200);
    const url = new URL(body.authorizeUrl);
    assert.equal(url.hostname, "github.com");
    assert.equal(url.pathname, "/login/oauth/authorize");
    assert.ok(url.searchParams.get("state"));
  } finally {
    await handle.close();
  }
});

test("GET /auth/github/callback rejects invalid state", async () => {
  const handle = await startAuthTestServer();
  try {
    const response = await fetch(
      `${handle.baseUrl}/auth/github/callback?code=ok&state=invalid`,
    );
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_OAUTH_STATE");
  } finally {
    await handle.close();
  }
});

test("OAuth callback returns session token on success", async () => {
  const handle = await startAuthTestServer();
  try {
    const startResponse = await fetch(`${handle.baseUrl}/auth/github/start`);
    const startBody = (await startResponse.json()) as { authorizeUrl: string };
    const state = new URL(startBody.authorizeUrl).searchParams.get("state");
    assert.ok(state);

    const callbackResponse = await fetch(
      `${handle.baseUrl}/auth/github/callback?code=good-code&state=${state}&response=json`,
    );
    const callbackBody = (await callbackResponse.json()) as {
      token: string;
      expiresAt: string;
      user: { id: string; githubId: string; username: string };
    };

    assert.equal(callbackResponse.status, 200);
    assert.ok(callbackBody.token);
    assert.ok(callbackBody.expiresAt);
    assert.equal(callbackBody.user.githubId, "42");
    assert.equal(callbackBody.user.username, "asifarko");
  } finally {
    await handle.close();
  }
});

test("OAuth callback sets cookie and redirects to dashboard by default", async () => {
  const handle = await startAuthTestServer();
  try {
    const startResponse = await fetch(`${handle.baseUrl}/auth/github/start`);
    const startBody = (await startResponse.json()) as { authorizeUrl: string };
    const state = new URL(startBody.authorizeUrl).searchParams.get("state");
    assert.ok(state);

    const callbackResponse = await fetch(
      `${handle.baseUrl}/auth/github/callback?code=good-code&state=${state}`,
      { redirect: "manual" },
    );
    assert.equal(callbackResponse.status, 302);
    assert.equal(callbackResponse.headers.get("location"), "/dashboard");
    const setCookie = callbackResponse.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /hunt_session=/);
    assert.match(setCookie, /HttpOnly/i);
  } finally {
    await handle.close();
  }
});
