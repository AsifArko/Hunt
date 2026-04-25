import type { Middleware, RouteHandler } from "../http/types.js";
import type { OAuthService } from "./service.js";
export declare function createAuthGuardMiddleware(authService: OAuthService): Middleware;
export declare function requireAuthenticated(handler: RouteHandler): RouteHandler;
//# sourceMappingURL=middleware.d.ts.map