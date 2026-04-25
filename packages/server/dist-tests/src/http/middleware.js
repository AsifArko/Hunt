import { randomUUID } from "node:crypto";
import { HttpError } from "./errors.js";
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
function hasJsonContentType(contentType) {
    if (!contentType) {
        return false;
    }
    return contentType.toLowerCase().includes("application/json");
}
async function readRawBody(ctx, maxBodyBytes) {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of ctx.req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.byteLength;
        if (totalBytes > maxBodyBytes) {
            throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request payload too large.");
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString("utf-8");
}
export function composeMiddleware(middlewares) {
    return async (ctx, next) => {
        let index = -1;
        async function invoke(currentIndex) {
            if (currentIndex <= index) {
                throw new Error("next() called multiple times in middleware chain.");
            }
            index = currentIndex;
            const middlewareCandidate = currentIndex < middlewares.length ? middlewares[currentIndex] : next;
            if (!middlewareCandidate) {
                return;
            }
            await middlewareCandidate(ctx, () => invoke(currentIndex + 1));
        }
        await invoke(0);
    };
}
export function createRequestIdMiddleware() {
    return async (ctx, next) => {
        ctx.requestId = randomUUID();
        ctx.res.setHeader("x-request-id", ctx.requestId);
        await next();
    };
}
export function createJsonBodyParserMiddleware(options = {}) {
    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    return async (ctx, next) => {
        const method = (ctx.req.method ?? "GET").toUpperCase();
        if (method === "GET" || method === "HEAD") {
            await next();
            return;
        }
        if (!hasJsonContentType(ctx.req.headers["content-type"])) {
            await next();
            return;
        }
        const rawBody = await readRawBody(ctx, maxBodyBytes);
        if (rawBody.length === 0) {
            ctx.body = {};
            await next();
            return;
        }
        try {
            ctx.body = JSON.parse(rawBody);
        }
        catch {
            throw new HttpError(400, "INVALID_JSON", "Request body contains invalid JSON.");
        }
        await next();
    };
}
export function createLoggingMiddleware() {
    return async (ctx, next) => {
        const startedAt = Date.now();
        const method = ctx.req.method ?? "GET";
        const path = ctx.req.url ?? "/";
        ctx.logger.info("request_started", {
            requestId: ctx.requestId,
            method,
            path,
        });
        await next();
        const durationMs = Date.now() - startedAt;
        ctx.logger.info("request_completed", {
            requestId: ctx.requestId,
            method,
            path,
            statusCode: ctx.res.statusCode,
            durationMs,
        });
    };
}
export function createSecurityHeadersMiddleware() {
    return async (ctx, next) => {
        ctx.res.setHeader("x-content-type-options", "nosniff");
        ctx.res.setHeader("x-frame-options", "DENY");
        ctx.res.setHeader("referrer-policy", "no-referrer");
        ctx.res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
        ctx.res.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';");
        await next();
    };
}
//# sourceMappingURL=middleware.js.map