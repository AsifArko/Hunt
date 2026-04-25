import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "../src/domain/errors.js";
import { validateConnectRepositoryInput, validateCreateIdentityClaimInput, validateCreateSignalInput, validateUpdateRepositorySettingsInput, } from "../src/domain/validation.js";
test("DomainError keeps code and context details", () => {
    const error = new DomainError("CONFLICT", "Repository already exists", {
        context: { owner: "acme", name: "repo" },
    });
    assert.equal(error.code, "CONFLICT");
    assert.equal(error.message, "Repository already exists");
    assert.deepEqual(error.details?.context, { owner: "acme", name: "repo" });
});
test("validateConnectRepositoryInput accepts valid shape", () => {
    assert.doesNotThrow(() => validateConnectRepositoryInput({
        owner: "AsifArko",
        name: "hunt",
        githubRepoId: "123456789",
        defaultBranch: "main",
        projectTokenPlaintext: "secret-token",
    }));
});
test("validateConnectRepositoryInput rejects empty fields", () => {
    assert.throws(() => validateConnectRepositoryInput({
        owner: "",
        name: "hunt",
        githubRepoId: "123456789",
        defaultBranch: "main",
        projectTokenPlaintext: "secret-token",
    }), (error) => error instanceof DomainError &&
        error.code === "VALIDATION_ERROR" &&
        /owner is required/.test(error.message));
});
test("validateCreateSignalInput rejects non ISO timestamp", () => {
    assert.throws(() => validateCreateSignalInput({
        repositoryId: "repo_1",
        eventType: "integration_initialized",
        eventTimestamp: "2026-04-25",
    }), (error) => error instanceof DomainError &&
        error.code === "VALIDATION_ERROR" &&
        /ISO8601 UTC/.test(error.message));
});
test("validateCreateIdentityClaimInput rejects empty proof payload", () => {
    assert.throws(() => validateCreateIdentityClaimInput({
        repositoryId: "repo_1",
        userId: "user_1",
        claimTimestamp: "2026-04-25T10:00:00Z",
        proofType: "oauth_challenge",
        proofPayload: {},
    }), (error) => error instanceof DomainError &&
        error.code === "VALIDATION_ERROR" &&
        /proofPayload cannot be empty/.test(error.message));
});
test("validateUpdateRepositorySettingsInput rejects empty settings patch", () => {
    assert.throws(() => validateUpdateRepositorySettingsInput({
        repositoryId: "repo_1",
        settings: {},
    }), (error) => error instanceof DomainError &&
        error.code === "VALIDATION_ERROR" &&
        /at least one field/.test(error.message));
});
//# sourceMappingURL=domain-contracts.test.js.map