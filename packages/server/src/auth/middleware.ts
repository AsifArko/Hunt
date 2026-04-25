import { HttpError } from "../http/errors.js";
import type { Middleware, RequestContext, RouteHandler } from "../http/types.js";
import type { OAuthService } from "./service.js";

function extractBearerToken(ctx: RequestContext): string | null {
  const authorization = ctx.req.headers.authorization;
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .reduce<Record<string, string>>((acc, pair) => {
      const idx = pair.indexOf("=");
      if (idx <= 0) {
        return acc;
      }
      const key = pair.slice(0, idx).trim();
      const rawValue = pair.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(rawValue);
      return acc;
    }, {});
}

function extractCookieToken(ctx: RequestContext): string | null {
  const cookieHeader = ctx.req.headers.cookie;
  if (!cookieHeader || Array.isArray(cookieHeader)) {
    return null;
  }
  const cookies = parseCookies(cookieHeader);
  return cookies.hunt_session ?? null;
}

export function createAuthGuardMiddleware(authService: OAuthService): Middleware {
  return async (ctx, next) => {
    const token = extractBearerToken(ctx) ?? extractCookieToken(ctx);
    if (!token) {
      await next();
      return;
    }

    ctx.auth = authService.verifySession(token);
    await next();
  };
}

export function requireAuthenticated(handler: RouteHandler): RouteHandler {
  return async (ctx) => {
    if (!ctx.auth) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
    }
    await handler(ctx);
  };
}
