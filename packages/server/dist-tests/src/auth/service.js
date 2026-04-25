import { HttpError } from "../http/errors.js";
function buildAuthorizeUrl(params) {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", params.githubClientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", params.scopes.join(" "));
    url.searchParams.set("state", params.state);
    return url.toString();
}
export class OAuthService {
    deps;
    config;
    constructor(deps, config) {
        this.deps = deps;
        this.config = config;
    }
    createStartUrl(origin) {
        const state = this.deps.stateStore.create(origin);
        const redirectUri = `${origin}/auth/github/callback`;
        return {
            authorizeUrl: buildAuthorizeUrl({
                githubClientId: this.config.githubClientId,
                redirectUri,
                state,
                scopes: this.config.oauthScopes,
            }),
        };
    }
    async handleCallback(params) {
        const consumed = this.deps.stateStore.consume(params.state);
        if (!consumed) {
            throw new HttpError(400, "INVALID_OAUTH_STATE", "OAuth state is invalid or expired.");
        }
        const redirectUri = `${consumed.origin}/auth/github/callback`;
        const accessToken = await this.deps.githubOAuthClient.exchangeCodeForAccessToken({
            code: params.code,
            redirectUri,
        });
        const profile = await this.deps.githubOAuthClient.fetchUserProfile(accessToken);
        const githubId = String(profile.id);
        const existingUser = await this.deps.userRepository.findByGithubId(githubId);
        const optionalAvatarPatch = profile.avatar_url
            ? { avatarUrl: profile.avatar_url }
            : {};
        const user = existingUser
            ? await this.deps.userRepository.update(existingUser.id, {
                username: profile.login,
                ...optionalAvatarPatch,
                oauthScopes: this.config.oauthScopes,
            })
            : await this.deps.userRepository.create({
                githubId,
                username: profile.login,
                ...optionalAvatarPatch,
                oauthScopes: this.config.oauthScopes,
            });
        const session = this.deps.jwtSigner.sign({
            sub: user.id,
            githubId: user.githubId,
            username: user.username,
        });
        return {
            session,
            user: {
                id: user.id,
                githubId: user.githubId,
                username: user.username,
            },
        };
    }
    verifySession(token) {
        const payload = this.deps.jwtSigner.verify(token);
        return {
            id: payload.sub,
            githubId: payload.githubId,
            username: payload.username,
        };
    }
}
//# sourceMappingURL=service.js.map