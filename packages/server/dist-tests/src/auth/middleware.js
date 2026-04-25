import { HttpError } from "../http/errors.js";
function extractBearerToken(ctx) {
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
function parseCookies(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }
    return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .reduce((acc, pair) => {
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
function extractCookieToken(ctx) {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader || Array.isArray(cookieHeader)) {
        return null;
    }
    const cookies = parseCookies(cookieHeader);
    return cookies.hunt_session ?? null;
}
export function createAuthGuardMiddleware(authService) {
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
export function requireAuthenticated(handler) {
    return async (ctx) => {
        if (!ctx.auth) {
            throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
        }
        await handler(ctx);
    };
}
//# sourceMappingURL=middleware.js.map