import assert from "node:assert/strict";
import test from "node:test";
import { MongoConnectionManager, createMongoRepositories } from "../src/db/index.js";
const testUri = process.env.HUNT_TEST_MONGODB_URI;
const runIntegration = Boolean(testUri);
const integrationTest = runIntegration ? test : test.skip;
integrationTest("mongo connection lifecycle connect/disconnect", async () => {
    const manager = new MongoConnectionManager({
        uri: testUri ?? "",
        dbName: `hunt_test_${Date.now()}`,
        maxRetries: 1,
        serverSelectionTimeoutMs: 2_000,
        connectTimeoutMs: 2_000,
    });
    const context = await manager.connect();
    assert.ok(context.db);
    await manager.disconnect();
});
integrationTest("mongo repositories provide functional CRUD paths", async () => {
    const dbName = `hunt_repo_test_${Date.now()}`;
    const manager = new MongoConnectionManager({
        uri: testUri ?? "",
        dbName,
        maxRetries: 1,
        serverSelectionTimeoutMs: 2_000,
        connectTimeoutMs: 2_000,
    });
    const context = await manager.connect();
    const repos = createMongoRepositories(context.collections);
    const user = await repos.users.create({
        githubId: "gh_123",
        username: "asifarko",
        oauthScopes: ["repo"],
        avatarUrl: "https://example.com/avatar.png",
    });
    assert.equal(user.username, "asifarko");
    const repository = await repos.repositories.create({
        owner: "asifarko",
        name: "hunt",
        githubRepoId: "repo_123",
        defaultBranch: "main",
        projectTokenHash: "hash_value",
        settings: {
            privacyMode: "balanced",
            retentionDays: 30,
            claimPolicy: "manual_review",
        },
    });
    assert.equal(repository.name, "hunt");
    const foundRepo = await repos.repositories.findByOwnerAndName("asifarko", "hunt");
    assert.ok(foundRepo);
    assert.equal(foundRepo.id, repository.id);
    const metric = await repos.cloneMetrics.insert({
        repositoryId: repository.id,
        windowStart: "2026-04-20T00:00:00Z",
        windowEnd: "2026-04-20T23:59:59Z",
        totalClones: 100,
        uniqueCloners: 50,
        source: "github_traffic_api",
        collectedAt: new Date().toISOString(),
    });
    assert.equal(metric.totalClones, 100);
    const signal = await repos.signals.insert({
        repositoryId: repository.id,
        eventType: "integration_initialized",
        eventTimestamp: new Date().toISOString(),
        metadata: { idempotencyKey: "idmp-123" },
    });
    assert.equal(signal.eventType, "integration_initialized");
    const sameSignal = await repos.signals.findByIdempotencyKey("idmp-123");
    assert.ok(sameSignal);
    assert.equal(sameSignal.id, signal.id);
    const claim = await repos.identityClaims.insert({
        repositoryId: repository.id,
        userId: user.id,
        claimTimestamp: new Date().toISOString(),
        proofType: "oauth_challenge",
        proofPayload: { challenge: "abc" },
        confidenceLevel: "medium",
        verificationStatus: "pending",
    });
    assert.equal(claim.verificationStatus, "pending");
    const updatedClaim = await repos.identityClaims.updateStatus(claim.id, "verified");
    assert.equal(updatedClaim.verificationStatus, "verified");
    await repos.auditLogs.insert({
        actorUserId: user.id,
        repositoryId: repository.id,
        action: "claim_verified",
        targetType: "identity_claim",
        targetId: claim.id,
        metadata: { via: "test" },
    });
    const indexInfo = await context.collections.repositories.indexes();
    const indexNames = indexInfo.map((index) => index.name);
    assert.ok(indexNames.includes("repositories_owner_name_unique"));
    await manager.disconnect();
});
//# sourceMappingURL=mongo-repositories.integration.test.js.map