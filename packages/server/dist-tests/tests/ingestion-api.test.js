import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createHttpApp } from "../src/http/app.js";
import { computeSignatureForTesting } from "../src/ingestion/signature.js";
class InMemoryUserRepository {
    byId = new Map();
    byGithubId = new Map();
    counter = 0;
    async create(input) {
        const id = `user_${++this.counter}`;
        const now = new Date().toISOString();
        const user = { id, createdAt: now, updatedAt: now, ...input };
        this.byId.set(id, user);
        this.byGithubId.set(user.githubId, id);
        return user;
    }
    async findById(id) {
        return this.byId.get(id) ?? null;
    }
    async findByGithubId(githubId) {
        const id = this.byGithubId.get(githubId);
        return id ? (this.byId.get(id) ?? null) : null;
    }
    async update(id, patch) {
        const existing = this.byId.get(id);
        if (!existing) {
            throw new Error("user not found");
        }
        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        this.byId.set(id, updated);
        return updated;
    }
}
class InMemoryRepositoryRepository {
    byId = new Map();
    counter = 0;
    async create(input) {
        const id = `repo_${++this.counter}`;
        const now = new Date().toISOString();
        const item = { id, createdAt: now, updatedAt: now, ...input };
        this.byId.set(id, item);
        return item;
    }
    async findById(id) {
        return this.byId.get(id) ?? null;
    }
    async findByOwnerAndName(owner, name) {
        for (const repo of this.byId.values()) {
            if (repo.owner === owner && repo.name === name) {
                return repo;
            }
        }
        return null;
    }
    async listByOwnerId(ownerId, limit, cursor) {
        const items = Array.from(this.byId.values()).filter((repo) => repo.owner === ownerId);
        const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
        return items.slice(start, start + limit);
    }
    async listForPolling(limit, cursor) {
        const items = Array.from(this.byId.values());
        const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0;
        return items.slice(start, start + limit);
    }
    async update(id, patch) {
        const existing = this.byId.get(id);
        if (!existing) {
            throw new Error("repository not found");
        }
        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        this.byId.set(id, updated);
        return updated;
    }
}
class InMemorySignalRepository {
    byIdempotency = new Map();
    byId = new Map();
    counter = 0;
    async insert(signal) {
        const id = `sig_${++this.counter}`;
        const createdAt = new Date().toISOString();
        const item = { id, createdAt, ...signal };
        this.byId.set(id, item);
        const key = signal.metadata.idempotencyKey;
        if (typeof key === "string") {
            this.byIdempotency.set(key, item);
        }
        return item;
    }
    async findByIdempotencyKey(idempotencyKey) {
        return this.byIdempotency.get(idempotencyKey) ?? null;
    }
}
class InMemoryIdentityClaimRepository {
    byId = new Map();
    counter = 0;
    async insert(claim) {
        const id = `claim_${++this.counter}`;
        const now = new Date().toISOString();
        const item = { id, createdAt: now, updatedAt: now, ...claim };
        this.byId.set(id, item);
        return item;
    }
    async listByRepository(repositoryId) {
        return Array.from(this.byId.values()).filter((claim) => claim.repositoryId === repositoryId);
    }
    async updateStatus(id, status) {
        const existing = this.byId.get(id);
        if (!existing) {
            throw new Error("claim not found");
        }
        const updated = { ...existing, verificationStatus: status, updatedAt: new Date().toISOString() };
        this.byId.set(id, updated);
        return updated;
    }
}
class MockGithubOAuthClient {
    async exchangeCodeForAccessToken(params) {
        return `${params.code}:${params.redirectUri}`;
    }
    async fetchUserProfile(accessToken) {
        const [code] = accessToken.split(":");
        if (code === "bob") {
            return { id: 2, login: "bob" };
        }
        return { id: 1, login: "alice" };
    }
}
async function startServerForIngestion() {
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
    const server = createServer((req, res) => {
        void app.handle(req, res);
    });
    await new Promise((resolve) => server.listen(0, () => resolve()));
    const addr = server.address();
    if (!addr || typeof addr === "string") {
        throw new Error("bad address");
    }
    return {
        baseUrl: `http://127.0.0.1:${addr.port}`,
        repoRepository,
        signalRepository,
        close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
    };
}
async function authToken(baseUrl, code) {
    const startResponse = await fetch(`${baseUrl}/auth/github/start`);
    const startBody = (await startResponse.json());
    const state = new URL(startBody.authorizeUrl).searchParams.get("state");
    assert.ok(state);
    const callbackResponse = await fetch(`${baseUrl}/auth/github/callback?code=${code}&state=${state}&response=json`);
    assert.equal(callbackResponse.status, 200);
    const callbackBody = (await callbackResponse.json());
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
        const body = (await response.json());
        assert.equal(response.status, 401);
        assert.equal(body.error.code, "INVALID_SIGNATURE");
    }
    finally {
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
        const firstBody = (await firstResponse.json());
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
        const secondBody = (await secondResponse.json());
        assert.equal(secondResponse.status, 200);
        assert.equal(secondBody.idempotentReplay, true);
        assert.equal(secondBody.signal.id, firstBody.signal.id);
    }
    finally {
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
        const body = (await response.json());
        assert.equal(response.status, 201);
        assert.equal(body.claim.repositoryId, repo.id);
        assert.equal(body.claim.confidenceLevel, "medium");
        assert.equal(body.claim.verificationStatus, "pending");
    }
    finally {
        await handle.close();
    }
});
//# sourceMappingURL=ingestion-api.test.js.map