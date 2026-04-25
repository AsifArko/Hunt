import type { AuthServiceDependencies, AuthenticatedUser, SessionTokenPair } from "./types.js";
export interface OAuthStartResult {
    authorizeUrl: string;
}
export interface OAuthCallbackResult {
    session: SessionTokenPair;
    user: AuthenticatedUser;
}
interface OAuthServiceConfig {
    githubClientId: string;
    oauthScopes: string[];
}
export declare class OAuthService {
    private readonly deps;
    private readonly config;
    constructor(deps: AuthServiceDependencies, config: OAuthServiceConfig);
    createStartUrl(origin: string): OAuthStartResult;
    handleCallback(params: {
        code: string;
        state: string;
    }): Promise<OAuthCallbackResult>;
    verifySession(token: string): AuthenticatedUser;
}
export {};
//# sourceMappingURL=service.d.ts.map