import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createHttpApp } from "../src/http/app.js";
import { Router } from "../src/http/router.js";
import { sendJson } from "../src/http/response.js";
async function startTestServer(router) {
    const options = {
        config: {
            logging: {
                level: "error",
            },
            http: {
                maxBodyBytes: 128,
            },
        },
    };
    if (router) {
        options.router = router;
    }
    const app = createHttpApp(options);
    const server = createServer((req, res) => {
        void app.handle(req, res);
    });
    await new Promise((resolve) => {
        server.listen(0, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Failed to read test server port.");
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
test("GET /health returns service status", async () => {
    const handle = await startTestServer();
    try {
        const response = await fetch(`${handle.baseUrl}/health`);
        const body = (await response.json());
        assert.equal(response.status, 200);
        assert.equal(body.status, "ok");
        assert.equal(body.service, "@hunt/server");
        assert.ok(response.headers.get("x-request-id"));
    }
    finally {
        await handle.close();
    }
});
test("invalid json returns clean validation error response", async () => {
    const router = new Router();
    router.post("/json-check", async (ctx) => {
        sendJson(ctx.res, 200, { ok: true });
    });
    const handle = await startTestServer(router);
    try {
        const response = await fetch(`${handle.baseUrl}/json-check`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: '{"invalid":',
        });
        const body = (await response.json());
        assert.equal(response.status, 400);
        assert.equal(body.error.code, "INVALID_JSON");
        assert.match(body.error.message, /invalid JSON/i);
        assert.ok(body.error.requestId);
    }
    finally {
        await handle.close();
    }
});
test("unhandled errors are normalized to safe response", async () => {
    const router = new Router();
    router.get("/boom", async () => {
        throw new Error("unexpected failure");
    });
    const handle = await startTestServer(router);
    try {
        const response = await fetch(`${handle.baseUrl}/boom`);
        const body = (await response.json());
        assert.equal(response.status, 500);
        assert.equal(body.error.code, "INTERNAL_ERROR");
        assert.equal(body.error.message, "Internal server error.");
        assert.ok(body.error.requestId);
    }
    finally {
        await handle.close();
    }
});
test("unknown routes return normalized not found response", async () => {
    const handle = await startTestServer();
    try {
        const response = await fetch(`${handle.baseUrl}/does-not-exist`);
        const body = (await response.json());
        assert.equal(response.status, 404);
        assert.equal(body.error.code, "NOT_FOUND");
    }
    finally {
        await handle.close();
    }
});
test("security headers are applied on responses", async () => {
    const handle = await startTestServer();
    try {
        const response = await fetch(`${handle.baseUrl}/health`);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("x-frame-options"), "DENY");
        assert.equal(response.headers.get("referrer-policy"), "no-referrer");
        assert.ok(response.headers.get("content-security-policy"));
    }
    finally {
        await handle.close();
    }
});
test("json body larger than configured limit is rejected", async () => {
    const router = new Router();
    router.post("/limited", async (ctx) => {
        sendJson(ctx.res, 200, { ok: true, body: ctx.body });
    });
    const handle = await startTestServer(router);
    try {
        const payload = JSON.stringify({ text: "x".repeat(400) });
        const response = await fetch(`${handle.baseUrl}/limited`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
        });
        const body = (await response.json());
        assert.equal(response.status, 413);
        assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
    }
    finally {
        await handle.close();
    }
});
//# sourceMappingURL=http-app.test.js.map