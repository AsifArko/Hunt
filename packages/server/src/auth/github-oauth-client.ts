import { HttpError } from "../http/errors.js";
import type { GithubOAuthClient, GithubUserProfile } from "./types.js";

const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_PROFILE_URL = "https://api.github.com/user";

interface TokenResponse {
  access_token?: string;
  token_type?: string;
}

interface GithubOAuthClientOptions {
  clientId: string;
  clientSecret: string;
  fetcher?: typeof fetch;
}

export class DefaultGithubOAuthClient implements GithubOAuthClient {
  private readonly fetcher: typeof fetch;

  public constructor(private readonly options: GithubOAuthClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  public async exchangeCodeForAccessToken(params: {
    code: string;
    redirectUri: string;
  }): Promise<string> {
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
      throw new HttpError(
        502,
        "OAUTH_TOKEN_EXCHANGE_FAILED",
        "Unable to complete GitHub OAuth token exchange.",
      );
    }

    const payload = (await response.json()) as TokenResponse;
    if (!payload.access_token) {
      throw new HttpError(
        502,
        "OAUTH_TOKEN_EXCHANGE_FAILED",
        "GitHub OAuth token response is missing access token.",
      );
    }

    return payload.access_token;
  }

  public async fetchUserProfile(accessToken: string): Promise<GithubUserProfile> {
    const response = await this.fetcher(GITHUB_USER_PROFILE_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "user-agent": "hunt-oauth-client",
      },
    });

    if (!response.ok) {
      throw new HttpError(
        502,
        "OAUTH_PROFILE_FETCH_FAILED",
        "Unable to fetch GitHub user profile.",
      );
    }

    const payload = (await response.json()) as GithubUserProfile;
    if (!payload.id || !payload.login) {
      throw new HttpError(
        502,
        "OAUTH_PROFILE_FETCH_FAILED",
        "GitHub profile payload is incomplete.",
      );
    }
    return payload;
  }
}
