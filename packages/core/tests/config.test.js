import test from "node:test";
import assert from "node:assert/strict";
import { ConfigValidationError, loadConfig } from "../src/config.js";
function validEnv() {
    return {
        HUNT_NODE_ENV: "development",
        HUNT_PORT: "4000",
        HUNT_MONGODB_URI: "mongodb://localhost:27017",
        HUNT_MONGODB_DB_NAME: "hunt_dev",
        HUNT_GITHUB_CLIENT_ID: "github-client-id",
        HUNT_GITHUB_CLIENT_SECRET: "github-client-secret",
        HUNT_JWT_SECRET: "jwt-secret",
        HUNT_SIGNING_SECRET: "signing-secret",
        HUNT_LOG_LEVEL: "info",
    };
}
test("loadConfig returns typed immutable config for valid env", () => {
    const config = loadConfig(validEnv());
    assert.equal(config.nodeEnv, "development");
    assert.equal(config.port, 4000);
    assert.equal(config.mongodb.uri, "mongodb://localhost:27017");
    assert.equal(config.logging.level, "info");
    assert.equal(Object.isFrozen(config), true);
    assert.equal(Object.isFrozen(config.mongodb), true);
});
test("loadConfig throws aggregated errors for missing required values", () => {
    const input = {
        HUNT_NODE_ENV: "development",
        HUNT_PORT: "4000",
    };
    assert.throws(() => loadConfig(input), (error) => {
        assert.ok(error instanceof ConfigValidationError);
        assert.match(error.message, /HUNT_MONGODB_URI is required/);
        assert.match(error.message, /HUNT_JWT_SECRET is required/);
        assert.match(error.message, /HUNT_SIGNING_SECRET is required/);
        return true;
    });
});
test("loadConfig throws actionable error for invalid value types", () => {
    const input = validEnv();
    input.HUNT_PORT = "abc";
    input.HUNT_LOG_LEVEL = "verbose";
    input.HUNT_MONGODB_URI = "http://example.com";
    assert.throws(() => loadConfig(input), (error) => {
        assert.ok(error instanceof ConfigValidationError);
        assert.match(error.message, /HUNT_PORT must be a positive integer/);
        assert.match(error.message, /HUNT_LOG_LEVEL has invalid value/);
        assert.match(error.message, /HUNT_MONGODB_URI must start with/);
        return true;
    });
});
//# sourceMappingURL=config.test.js.map