import type { User, UserRepository } from "@hunt/core";
export interface SessionPayload {
    sub: string;
    githubId: string;
    username: string;
}
export interface SessionTokenPair {
    token: string;
    expiresAt: string;
}
export interface GithubUserProfile {
    id: number;
    login: string;
    avatar_url?: string;
}
export interface GithubOAuthClient {
    exchangeCodeForAccessToken(params: {
        code: string;
        redirectUri: string;
    }): Promise<string>;
    fetchUserProfile(accessToken: string): Promise<GithubUserProfile>;
}
export interface StateStore {
    create(origin: string): string;
    consume(state: string): {
        origin: string;
    } | null;
}
export interface JwtSigner {
    sign(payload: SessionPayload): SessionTokenPair;
    verify(token: string): SessionPayload;
}
export interface AuthServiceDependencies {
    userRepository: UserRepository;
    githubOAuthClient: GithubOAuthClient;
    stateStore: StateStore;
    jwtSigner: JwtSigner;
}
export interface AuthenticatedUser {
    id: User["id"];
    githubId: User["githubId"];
    username: User["username"];
}
//# sourceMappingURL=types.d.ts.map