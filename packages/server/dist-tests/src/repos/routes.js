import { sendJson } from "../http/response.js";
import { requireAuthenticated } from "../auth/middleware.js";
import { HttpError } from "../http/errors.js";
function requireAuthUser(user) {
    if (!user) {
        throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
    }
    return user;
}
export function registerRepositoryRoutes(router, repositoryService) {
    router.post("/v1/repos/connect", requireAuthenticated(async (ctx) => {
        const result = await repositoryService.connect(requireAuthUser(ctx.auth), ctx.body);
        sendJson(ctx.res, 201, result);
    }));
    router.get("/v1/repos", requireAuthenticated(async (ctx) => {
        const items = await repositoryService.list(requireAuthUser(ctx.auth));
        sendJson(ctx.res, 200, { items });
    }));
    router.get("/v1/repos/:repoId", requireAuthenticated(async (ctx) => {
        const repoId = ctx.params.repoId;
        if (!repoId) {
            throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
        }
        const repository = await repositoryService.getById(requireAuthUser(ctx.auth), repoId);
        sendJson(ctx.res, 200, { repository });
    }));
    router.patch("/v1/repos/:repoId/settings", requireAuthenticated(async (ctx) => {
        const repoId = ctx.params.repoId;
        if (!repoId) {
            throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
        }
        const repository = await repositoryService.updateSettings(requireAuthUser(ctx.auth), repoId, ctx.body);
        sendJson(ctx.res, 200, { repository });
    }));
    router.get("/v1/repos/:repoId/metrics/clones", requireAuthenticated(async (ctx) => {
        const repoId = ctx.params.repoId;
        if (!repoId) {
            throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
        }
        const items = await repositoryService.listCloneMetrics(requireAuthUser(ctx.auth), repoId);
        sendJson(ctx.res, 200, { items });
    }));
    router.get("/v1/repos/:repoId/claims", requireAuthenticated(async (ctx) => {
        const repoId = ctx.params.repoId;
        if (!repoId) {
            throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
        }
        const items = await repositoryService.listClaims(requireAuthUser(ctx.auth), repoId);
        sendJson(ctx.res, 200, { items });
    }));
}
//# sourceMappingURL=routes.js.map