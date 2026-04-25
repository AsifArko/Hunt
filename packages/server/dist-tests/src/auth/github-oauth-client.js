import { HttpError } from "../http/errors.js";
const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_PROFILE_URL = "https://api.github.com/user";
export class DefaultGithubOAuthClient {
    options;
    fetcher;
    constructor(options) {
        this.options = options;
        this.fetcher = options.fetcher ?? fetch;
    }
    async exchangeCodeForAccessToken(params) {
        const response = await this.fetcher(GITHUB_OAUTH_TOKEN_URL, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                client_id: this.options.clientId,
                client_secret: this.options.clientSecret,
                code: params.code,
                redirect_uri: params.redirectUri,
            }),
        });
        if (!response.ok) {
            throw new HttpError(502, "OAUTH_TOKEN_EXCHANGE_FAILED", "Unable to complete GitHub OAuth token exchange.");
        }
        const payload = (await response.json());
        if (!payload.access_token) {
            throw new HttpError(502, "OAUTH_TOKEN_EXCHANGE_FAILED", "GitHub OAuth token response is missing access token.");
        }
        return payload.access_token;
    }
    async fetchUserProfile(accessToken) {
        const response = await this.fetcher(GITHUB_USER_PROFILE_URL, {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${accessToken}`,
                "user-agent": "hunt-oauth-client",
            },
        });
        if (!response.ok) {
            throw new HttpError(502, "OAUTH_PROFILE_FETCH_FAILED", "Unable to fetch GitHub user profile.");
        }
        const payload = (await response.json());
        if (!payload.id || !payload.login) {
            throw new HttpError(502, "OAUTH_PROFILE_FETCH_FAILED", "GitHub profile payload is incomplete.");
        }
        return payload;
    }
}
//# sourceMappingURL=github-oauth-client.js.map