import { requireAuthenticated } from "../auth/middleware.js";
import { HttpError } from "../http/errors.js";
import { sendJson } from "../http/response.js";
function requireAuthUser(user) {
    if (!user) {
        throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
    }
    return user;
}
export function registerIngestionRoutes(router, ingestionService) {
    router.post("/v1/signals", async (ctx) => {
        const signature = ctx.req.headers["x-hunt-signature"];
        const timestamp = ctx.req.headers["x-hunt-timestamp"];
        const idempotencyKey = ctx.req.headers["idempotency-key"];
        const result = await ingestionService.ingestSignal({
            payload: ctx.body,
            signature: Array.isArray(signature) ? signature[0] : signature,
            timestamp: Array.isArray(timestamp) ? timestamp[0] : timestamp,
            idempotencyKey: Array.isArray(idempotencyKey)
                ? idempotencyKey[0]
                : idempotencyKey,
        });
        sendJson(ctx.res, result.idempotentReplay ? 200 : 201, result);
    });
    router.post("/v1/claims", requireAuthenticated(async (ctx) => {
        const claim = await ingestionService.createClaim(requireAuthUser(ctx.auth), ctx.body);
        sendJson(ctx.res, 201, { claim });
    }));
}
//# sourceMappingURL=routes.js.map