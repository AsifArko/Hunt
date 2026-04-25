import { createHmac } from "node:crypto";
import { HttpError } from "../http/errors.js";
function base64UrlEncode(input) {
    return Buffer.from(input, "utf-8").toString("base64url");
}
function base64UrlDecode(input) {
    return Buffer.from(input, "base64url").toString("utf-8");
}
function signRaw(secret, message) {
    return createHmac("sha256", secret).update(message).digest("base64url");
}
export class HmacJwtSigner {
    secret;
    expiresInSeconds;
    constructor(secret, expiresInSeconds) {
        this.secret = secret;
        this.expiresInSeconds = expiresInSeconds;
    }
    sign(payload) {
        const now = Math.floor(Date.now() / 1000);
        const claims = {
            ...payload,
            iat: now,
            exp: now + this.expiresInSeconds,
        };
        const header = { alg: "HS256", typ: "JWT" };
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(claims));
        const signature = signRaw(this.secret, `${encodedHeader}.${encodedPayload}`);
        const token = `${encodedHeader}.${encodedPayload}.${signature}`;
        return {
            token,
            expiresAt: new Date(claims.exp * 1000).toISOString(),
        };
    }
    verify(token) {
        const segments = token.split(".");
        if (segments.length !== 3) {
            throw new HttpError(401, "INVALID_TOKEN", "Invalid authentication token.");
        }
        const [encodedHeader, encodedPayload, signature] = segments;
        if (!encodedHeader || !encodedPayload || !signature) {
            throw new HttpError(401, "INVALID_TOKEN", "Invalid authentication token.");
        }
        const expectedSignature = signRaw(this.secret, `${encodedHeader}.${encodedPayload}`);
        if (expectedSignature !== signature) {
            throw new HttpError(401, "INVALID_TOKEN", "Invalid authentication token.");
        }
        let claims;
        try {
            claims = JSON.parse(base64UrlDecode(encodedPayload));
        }
        catch {
            throw new HttpError(401, "INVALID_TOKEN", "Invalid authentication token.");
        }
        if (claims.exp <= Math.floor(Date.now() / 1000)) {
            throw new HttpError(401, "TOKEN_EXPIRED", "Authentication token expired.");
        }
        return {
            sub: claims.sub,
            githubId: claims.githubId,
            username: claims.username,
        };
    }
}
//# sourceMappingURL=jwt.js.map