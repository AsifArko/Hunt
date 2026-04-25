import { HttpError } from "./errors.js";
export class Router {
    routes = [];
    register(method, path, handler) {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        this.routes.push({
            method: method.toUpperCase(),
            path: normalizedPath,
            segments: this.pathToSegments(normalizedPath),
            handler,
        });
    }
    get(path, handler) {
        this.register("GET", path, handler);
    }
    post(path, handler) {
        this.register("POST", path, handler);
    }
    patch(path, handler) {
        this.register("PATCH", path, handler);
    }
    resolve(method, path) {
        const normalizedMethod = method.toUpperCase();
        const pathSegments = this.pathToSegments(path);
        for (const route of this.routes) {
            if (route.method !== normalizedMethod) {
                continue;
            }
            const params = this.matchSegments(route.segments, pathSegments);
            if (!params) {
                continue;
            }
            return {
                handler: route.handler,
                params,
            };
        }
        throw new HttpError(404, "NOT_FOUND", "Route not found.");
    }
    pathToSegments(path) {
        return path
            .split("/")
            .filter((segment) => segment.length > 0)
            .map((segment) => decodeURIComponent(segment));
    }
    matchSegments(routeSegments, pathSegments) {
        if (routeSegments.length !== pathSegments.length) {
            return null;
        }
        const params = {};
        for (let index = 0; index < routeSegments.length; index += 1) {
            const routeSegment = routeSegments[index];
            const pathSegment = pathSegments[index];
            if (!routeSegment || !pathSegment) {
                return null;
            }
            if (routeSegment.startsWith(":")) {
                const paramName = routeSegment.slice(1);
                if (!paramName) {
                    return null;
                }
                params[paramName] = pathSegment;
                continue;
            }
            if (routeSegment !== pathSegment) {
                return null;
            }
        }
        return params;
    }
}
//# sourceMappingURL=router.js.map