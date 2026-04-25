import type { RouteHandler } from "./types.js";
export interface RouteMatch {
    handler: RouteHandler;
    params: Record<string, string>;
}
export declare class Router {
    private readonly routes;
    register(method: string, path: string, handler: RouteHandler): void;
    get(path: string, handler: RouteHandler): void;
    post(path: string, handler: RouteHandler): void;
    patch(path: string, handler: RouteHandler): void;
    resolve(method: string, path: string): RouteMatch;
    private pathToSegments;
    private matchSegments;
}
//# sourceMappingURL=router.d.ts.map