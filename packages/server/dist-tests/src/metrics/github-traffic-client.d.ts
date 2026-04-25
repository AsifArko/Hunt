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
export declare class GitHubTrafficApiClient implements GitHubTrafficClient {
    private readonly options;
    private readonly fetcher;
    constructor(options: GitHubTrafficApiClientOptions);
    getCloneTraffic(owner: string, repo: string): Promise<GitCloneTraffic[]>;
}
export {};
//# sourceMappingURL=github-traffic-client.d.ts.map