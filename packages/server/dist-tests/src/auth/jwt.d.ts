import type { JwtSigner, SessionPayload, SessionTokenPair } from "./types.js";
export declare class HmacJwtSigner implements JwtSigner {
    private readonly secret;
    private readonly expiresInSeconds;
    constructor(secret: string, expiresInSeconds: number);
    sign(payload: SessionPayload): SessionTokenPair;
    verify(token: string): SessionPayload;
}
//# sourceMappingURL=jwt.d.ts.map