import { HttpError } from "../http/errors.js";
export class GitHubTrafficApiClient {
    options;
    fetcher;
    constructor(options) {
        this.options = options;
        this.fetcher = options.fetcher ?? fetch;
    }
    async getCloneTraffic(owner, repo) {
        const response = await this.fetcher(`https://api.github.com/repos/${owner}/${repo}/traffic/clones`, {
            method: "GET",
            headers: {
                accept: "application/vnd.github+json",
                authorization: `Bearer ${this.options.githubToken}`,
                "x-github-api-version": "2022-11-28",
                "user-agent": "hunt-metrics-poller",
            },
        });
        if (!response.ok) {
            throw new HttpError(502, "GITHUB_TRAFFIC_FETCH_FAILED", `Failed to fetch GitHub clone traffic for ${owner}/${repo}.`);
        }
        const payload = (await response.json());
        return (payload.clones ?? []).map((clone) => ({
            timestamp: clone.timestamp,
            count: clone.count,
            uniques: clone.uniques,
        }));
    }
}
//# sourceMappingURL=github-traffic-client.js.map