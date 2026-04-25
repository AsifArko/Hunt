import { HttpError } from "./errors.js";
import type { RouteHandler } from "./types.js";

interface RegisteredRoute {
  method: string;
  path: string;
  segments: string[];
  handler: RouteHandler;
}

export interface RouteMatch {
  handler: RouteHandler;
  params: Record<string, string>;
}

export class Router {
  private readonly routes: RegisteredRoute[] = [];

  public register(method: string, path: string, handler: RouteHandler): void {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    this.routes.push({
      method: method.toUpperCase(),
      path: normalizedPath,
      segments: this.pathToSegments(normalizedPath),
      handler,
    });
  }

  public get(path: string, handler: RouteHandler): void {
    this.register("GET", path, handler);
  }

  public post(path: string, handler: RouteHandler): void {
    this.register("POST", path, handler);
  }

  public patch(path: string, handler: RouteHandler): void {
    this.register("PATCH", path, handler);
  }

  public resolve(method: string, path: string): RouteMatch {
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

  private pathToSegments(path: string): string[] {
    return path
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => decodeURIComponent(segment));
  }

  private matchSegments(
    routeSegments: string[],
    pathSegments: string[],
  ): Record<string, string> | null {
    if (routeSegments.length !== pathSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};
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
