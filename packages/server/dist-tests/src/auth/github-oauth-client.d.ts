import type { GithubOAuthClient, GithubUserProfile } from "./types.js";
interface GithubOAuthClientOptions {
    clientId: string;
    clientSecret: string;
    fetcher?: typeof fetch;
}
export declare class DefaultGithubOAuthClient implements GithubOAuthClient {
    private readonly options;
    private readonly fetcher;
    constructor(options: GithubOAuthClientOptions);
    exchangeCodeForAccessToken(params: {
        code: string;
        redirectUri: string;
    }): Promise<string>;
    fetchUserProfile(accessToken: string): Promise<GithubUserProfile>;
}
export {};
//# sourceMappingURL=github-oauth-client.d.ts.map