import type { RouteHandler } from "../http/types.js";
import { HttpError } from "../http/errors.js";
import { sendJson } from "../http/response.js";
import type { Router } from "../http/router.js";
import type { OAuthService } from "./service.js";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function requestOrigin(reqHeaders: Record<string, string | string[] | undefined>): string {
  const xForwardedProto = headerValue(reqHeaders["x-forwarded-proto"]);
  const xForwardedHost = headerValue(reqHeaders["x-forwarded-host"]);
  if (xForwardedProto && xForwardedHost) {
    return `${xForwardedProto}://${xForwardedHost}`;
  }

  const host = headerValue(reqHeaders.host);
  if (!host) {
    throw new Error("Missing host header.");
  }
  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
  return `${protocol}://${host}`;
}

function readQuery(reqUrl: string | undefined): URL {
  return new URL(reqUrl ?? "/", "http://localhost");
}

function startHandler(authService: OAuthService): RouteHandler {
  return async (ctx) => {
    const origin = requestOrigin(ctx.req.headers);
    const result = authService.createStartUrl(origin);
    sendJson(ctx.res, 200, {
      authorizeUrl: result.authorizeUrl,
    });
  };
}

function callbackHandler(authService: OAuthService): RouteHandler {
  return async (ctx) => {
    const url = readQuery(ctx.req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const responseMode = url.searchParams.get("response");

    if (!code || !state) {
      throw new HttpError(
        400,
        "INVALID_OAUTH_CALLBACK",
        "OAuth callback must include code and state query parameters.",
      );
    }

    const result = await authService.handleCallback({ code, state });
    if (responseMode === "json") {
      sendJson(ctx.res, 200, {
        token: result.session.token,
        expiresAt: result.session.expiresAt,
        user: result.user,
      });
      return;
    }

    const isSecure = !requestOrigin(ctx.req.headers).startsWith("http://localhost");
    const cookieParts = [
      `hunt_session=${encodeURIComponent(result.session.token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Expires=${result.session.expiresAt}`,
    ];
    if (isSecure) {
      cookieParts.push("Secure");
    }
    ctx.res.statusCode = 302;
    ctx.res.setHeader("set-cookie", cookieParts.join("; "));
    ctx.res.setHeader("location", "/dashboard");
    ctx.res.end();
  };
}

export function registerAuthRoutes(router: Router, authService: OAuthService): void {
  router.get("/auth/github/start", startHandler(authService));
  router.get("/auth/github/callback", callbackHandler(authService));
  router.get("/auth/logout", async (ctx) => {
    const cookieParts = [
      "hunt_session=",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ];
    ctx.res.statusCode = 302;
    ctx.res.setHeader("set-cookie", cookieParts.join("; "));
    ctx.res.setHeader("location", "/dashboard");
    ctx.res.end();
  });
}
