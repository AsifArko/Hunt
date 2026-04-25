import { HttpError } from "../http/errors.js";

export interface GitCloneTraffic {
  timestamp: string;
  count: number;
  uniques: number;
}

export interface GitHubTrafficClient {
  getCloneTraffic(owner: string, repo: string): Promise<GitCloneTraffic[]>;
}

interface GitHubTrafficApiClientOptions {
  githubToken: string;
  fetcher?: typeof fetch;
}

interface GitHubCloneApiResponse {
  clones?: Array<{ timestamp: string; count: number; uniques: number }>;
}

export class GitHubTrafficApiClient implements GitHubTrafficClient {
  private readonly fetcher: typeof fetch;

  public constructor(private readonly options: GitHubTrafficApiClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  public async getCloneTraffic(owner: string, repo: string): Promise<GitCloneTraffic[]> {
    const response = await this.fetcher(
      `https://api.github.com/repos/${owner}/${repo}/traffic/clones`,
      {
        method: "GET",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${this.options.githubToken}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "hunt-metrics-poller",
        },
      },
    );

    if (!response.ok) {
      throw new HttpError(
        502,
        "GITHUB_TRAFFIC_FETCH_FAILED",
        `Failed to fetch GitHub clone traffic for ${owner}/${repo}.`,
      );
    }

    const payload = (await response.json()) as GitHubCloneApiResponse;
    return (payload.clones ?? []).map((clone) => ({
      timestamp: clone.timestamp,
      count: clone.count,
      uniques: clone.uniques,
    }));
  }
}
