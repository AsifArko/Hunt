import type { Middleware } from "./types.js";
export interface JsonBodyParserOptions {
    maxBodyBytes?: number;
}
export declare function composeMiddleware(middlewares: Middleware[]): Middleware;
export declare function createRequestIdMiddleware(): Middleware;
export declare function createJsonBodyParserMiddleware(options?: JsonBodyParserOptions): Middleware;
export declare function createLoggingMiddleware(): Middleware;
export declare function createSecurityHeadersMiddleware(): Middleware;
//# sourceMappingURL=middleware.d.ts.map