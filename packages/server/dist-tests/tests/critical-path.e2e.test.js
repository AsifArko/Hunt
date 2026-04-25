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
            throw new Error("User not found");
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
        const repo = { id, createdAt: now, updatedAt: now, ...input };
        this.byId.set(id, repo);
        return repo;
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
    async listByOwnerId(ownerId, limit) {
        return Array.from(this.byId.values()).filter((repo) => repo.owner === ownerId).slice(0, limit);
    }
    async listForPolling(limit) {
        return Array.from(this.byId.values()).slice(0, limit);
    }
    async update(id, patch) {
        const existing = this.byId.get(id);
        if (!existing) {
            throw new Error("Repository not found");
        }
        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        this.byId.set(id, updated);
        return updated;
    }
}
class InMemorySignalRepository {
    byIdempotency = new Map();
    counter = 0;
    async insert(signal) {
        const id = `sig_${++this.counter}`;
        const createdAt = new Date().toISOString();
        const item = { id, createdAt, ...signal };
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
    async insert(claim) {
        const now = new Date().toISOString();
        return { id: "claim_1", createdAt: now, updatedAt: now, ...claim };
    }
    async listByRepository() {
        return [];
    }
    async updateStatus() {
        throw new Error("Not implemented");
    }
}
class InMemoryCloneMetricRepository {
    async insert(metric) {
        return { id: "metric_1", ...metric };
    }
    async listByRepository() {
        return [];
    }
}
class MockGithubOAuthClient {
    async exchangeCodeForAccessToken(params) {
        return `${params.code}:${params.redirectUri}`;
    }
    async fetchUserProfile() {
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
    const server = createServer((req, res) => void app.handle(req, res));
    await new Promise((resolve) => server.listen(0, () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Address missing");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    try {
        const start = await fetch(`${baseUrl}/auth/github/start`);
        const startBody = (await start.json());
        const state = new URL(startBody.authorizeUrl).searchParams.get("state");
        assert.ok(state);
        const callback = await fetch(`${baseUrl}/auth/github/callback?code=good&state=${state}&response=json`);
        const callbackBody = (await callback.json());
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
        const connectBody = (await connectResponse.json());
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
        const metricsView = await fetch(`${baseUrl}/v1/repos/${connectBody.repository.id}/metrics/clones`, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(metricsView.status, 200);
        const metricsBody = (await metricsView.json());
        assert.ok(Array.isArray(metricsBody.items));
    }
    finally {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
});
//# sourceMappingURL=critical-path.e2e.test.js.map