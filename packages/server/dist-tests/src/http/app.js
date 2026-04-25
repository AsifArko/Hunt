import { DefaultGithubOAuthClient } from "../auth/github-oauth-client.js";
import { HmacJwtSigner } from "../auth/jwt.js";
import { createAuthGuardMiddleware } from "../auth/middleware.js";
import { registerAuthRoutes } from "../auth/routes.js";
import { OAuthService } from "../auth/service.js";
import { InMemoryStateStore } from "../auth/state-store.js";
import { healthHandler } from "../handlers/health.js";
import { registerRepositoryRoutes } from "../repos/routes.js";
import { RepositoryService } from "../repos/service.js";
import { IngestionService } from "../ingestion/service.js";
import { registerIngestionRoutes } from "../ingestion/routes.js";
import { registerWebRoutes } from "../web/index.js";
import { HttpError } from "./errors.js";
import { createConsoleLogger } from "./logger.js";
import { composeMiddleware, createJsonBodyParserMiddleware, createLoggingMiddleware, createRequestIdMiddleware, createSecurityHeadersMiddleware, } from "./middleware.js";
import { sendErrorJson } from "./response.js";
import { Router } from "./router.js";
function routeMiddleware(router) {
    return async (ctx) => {
        const method = ctx.req.method ?? "GET";
        const url = new URL(ctx.req.url ?? "/", "http://localhost");
        const match = router.resolve(method, url.pathname);
        ctx.params = match.params;
        await match.handler(ctx);
    };
}
function normalizeError(error) {
    if (error instanceof HttpError) {
        return {
            statusCode: error.statusCode,
            code: error.code,
            message: error.exposeMessage ? error.message : "Internal server error.",
            shouldLogStack: error.statusCode >= 500,
        };
    }
    return {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Internal server error.",
        shouldLogStack: true,
    };
}
export function createHttpApp(options) {
    const logger = options.logger ?? createConsoleLogger(options.config.logging.level);
    const router = options.router ?? new Router();
    router.get("/health", healthHandler);
    registerWebRoutes(router);
    let authMiddleware = null;
    let authService = null;
    if (options.config.auth && options.authDependencies) {
        const stateStore = new InMemoryStateStore(options.config.auth.stateTtlMs ?? 10 * 60 * 1000);
        const jwtSigner = new HmacJwtSigner(options.config.auth.jwtSecret, options.config.auth.jwtExpiresInSeconds ?? 60 * 60 * 24);
        const githubOAuthClient = options.authDependencies.githubOAuthClient ??
            new DefaultGithubOAuthClient({
                clientId: options.config.auth.githubClientId,
                clientSecret: options.config.auth.githubClientSecret,
            });
        authService = new OAuthService({
            userRepository: options.authDependencies.userRepository,
            githubOAuthClient,
            stateStore,
            jwtSigner,
        }, {
            githubClientId: options.config.auth.githubClientId,
            oauthScopes: options.config.auth.oauthScopes ?? ["read:user"],
        });
        registerAuthRoutes(router, authService);
        authMiddleware = createAuthGuardMiddleware(authService);
    }
    if (authService && options.repositoryDependencies) {
        const repositoryService = new RepositoryService({
            repositoryRepository: options.repositoryDependencies.repositoryRepository,
            ...(options.repositoryDependencies.cloneMetricRepository
                ? {
                    cloneMetricRepository: options.repositoryDependencies.cloneMetricRepository,
                }
                : {}),
            ...(options.repositoryDependencies.identityClaimRepository
                ? {
                    identityClaimRepository: options.repositoryDependencies.identityClaimRepository,
                }
                : {}),
            projectTokenBytes: options.config.repositories?.projectTokenBytes ?? 24,
        });
        registerRepositoryRoutes(router, repositoryService);
    }
    if (options.config.ingestion && options.ingestionDependencies) {
        const ingestionService = new IngestionService({
            signatureSecret: options.config.ingestion.signatureSecret,
            signatureMaxAgeSeconds: options.config.ingestion.signatureMaxAgeSeconds ?? 300,
            maxRequestsPerMinute: options.config.ingestion.maxRequestsPerMinute ?? 120,
        }, options.ingestionDependencies);
        registerIngestionRoutes(router, ingestionService);
    }
    const middlewareStack = [
        createRequestIdMiddleware(),
        createSecurityHeadersMiddleware(),
        createLoggingMiddleware(),
        createJsonBodyParserMiddleware(options.config.http?.maxBodyBytes !== undefined
            ? { maxBodyBytes: options.config.http.maxBodyBytes }
            : {}),
    ];
    if (authMiddleware) {
        middlewareStack.push(authMiddleware);
    }
    middlewareStack.push(routeMiddleware(router));
    const chain = composeMiddleware(middlewareStack);
    return {
        router,
        async handle(req, res) {
            const ctx = {
                req,
                res,
                requestId: "pending",
                body: undefined,
                params: {},
                logger,
            };
            try {
                await chain(ctx, async () => undefined);
            }
            catch (error) {
                const normalized = normalizeError(error);
                if (normalized.shouldLogStack) {
                    logger.error("request_failed", {
                        requestId: ctx.requestId,
                        error: error instanceof Error
                            ? { name: error.name, message: error.message, stack: error.stack }
                            : { message: "unknown error" },
                    });
                }
                else {
                    logger.warn("request_rejected", {
                        requestId: ctx.requestId,
                        code: normalized.code,
                        statusCode: normalized.statusCode,
                    });
                }
                sendErrorJson(res, normalized.statusCode, normalized.code, normalized.message, ctx.requestId);
            }
        },
    };
}
//# sourceMappingURL=app.js.map