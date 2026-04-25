import type { AuthenticatedUser } from "../auth/types.js";
import type { IncomingMessage, ServerResponse } from "node:http";
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
}
export interface RequestContext {
    req: IncomingMessage;
    res: ServerResponse;
    requestId: string;
    body: unknown;
    params: Record<string, string>;
    logger: Logger;
    auth?: AuthenticatedUser;
}
export type Next = () => Promise<void>;
export type Middleware = (ctx: RequestContext, next: Next) => Promise<void>;
export type RouteHandler = (ctx: RequestContext) => Promise<void> | void;
//# sourceMappingURL=types.d.ts.map