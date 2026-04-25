import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createHttpApp } from "../src/http/app.js";
class InMemoryUserRepository {
    byId = new Map();
    byGithubId = new Map();
    counter = 0;
    async create(input) {
        const id = `user_${++this.counter}`;
        const now = new Date().toISOString();
        const user = {
            id,
            createdAt: now,
            updatedAt: now,
            ...input,
        };
        this.byId.set(id, user);
        this.byGithubId.set(user.githubId, id);
        return user;
    }
    async findById(id) {
        return this.byId.get(id) ?? null;
    }
    async findByGithubId(githubId) {
        const id = this.byGithubId.get(githubId);
        if (!id) {
            return null;
        }
        return this.byId.get(id) ?? null;
    }
    async update(id, patch) {
        const existing = this.byId.get(id);
        if (!existing) {
            throw new Error(`User not found: ${id}`);
        }
        const updated = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
        };
        this.byId.set(id, updated);
        return updated;
    }
}
class MockGithubOAuthClient {
    async exchangeCodeForAccessToken(params) {
        if (params.code === "bad-code") {
            throw new Error("bad oauth code");
        }
        return `token-${params.redirectUri}`;
    }
    async fetchUserProfile() {
        return {
            id: 42,
            login: "asifarko",
            avatar_url: "https://example.com/avatar.png",
        };
    }
}
async function startAuthTestServer() {
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
    await new Promise((resolve) => {
        server.listen(0, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Failed to read server address.");
    }
    return {
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve, reject) => {
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
        const body = (await response.json());
        assert.equal(response.status, 200);
        const url = new URL(body.authorizeUrl);
        assert.equal(url.hostname, "github.com");
        assert.equal(url.pathname, "/login/oauth/authorize");
        assert.ok(url.searchParams.get("state"));
    }
    finally {
        await handle.close();
    }
});
test("GET /auth/github/callback rejects invalid state", async () => {
    const handle = await startAuthTestServer();
    try {
        const response = await fetch(`${handle.baseUrl}/auth/github/callback?code=ok&state=invalid`);
        const body = (await response.json());
        assert.equal(response.status, 400);
        assert.equal(body.error.code, "INVALID_OAUTH_STATE");
    }
    finally {
        await handle.close();
    }
});
test("OAuth callback returns session token on success", async () => {
    const handle = await startAuthTestServer();
    try {
        const startResponse = await fetch(`${handle.baseUrl}/auth/github/start`);
        const startBody = (await startResponse.json());
        const state = new URL(startBody.authorizeUrl).searchParams.get("state");
        assert.ok(state);
        const callbackResponse = await fetch(`${handle.baseUrl}/auth/github/callback?code=good-code&state=${state}&response=json`);
        const callbackBody = (await callbackResponse.json());
        assert.equal(callbackResponse.status, 200);
        assert.ok(callbackBody.token);
        assert.ok(callbackBody.expiresAt);
        assert.equal(callbackBody.user.githubId, "42");
        assert.equal(callbackBody.user.username, "asifarko");
    }
    finally {
        await handle.close();
    }
});
test("OAuth callback sets cookie and redirects to dashboard by default", async () => {
    const handle = await startAuthTestServer();
    try {
        const startResponse = await fetch(`${handle.baseUrl}/auth/github/start`);
        const startBody = (await startResponse.json());
        const state = new URL(startBody.authorizeUrl).searchParams.get("state");
        assert.ok(state);
        const callbackResponse = await fetch(`${handle.baseUrl}/auth/github/callback?code=good-code&state=${state}`, { redirect: "manual" });
        assert.equal(callbackResponse.status, 302);
        assert.equal(callbackResponse.headers.get("location"), "/dashboard");
        const setCookie = callbackResponse.headers.get("set-cookie");
        assert.ok(setCookie);
        assert.match(setCookie, /hunt_session=/);
        assert.match(setCookie, /HttpOnly/i);
    }
    finally {
        await handle.close();
    }
});
//# sourceMappingURL=auth-oauth.test.js.map