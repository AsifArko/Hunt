function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isDuplicateKeyError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000);
}
export class CloneMetricsPoller {
    options;
    deps;
    timer = null;
    running = false;
    constructor(options, deps) {
        this.options = options;
        this.deps = deps;
    }
    start() {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.runOnce();
        }, this.options.intervalMs);
    }
    stop() {
        if (!this.timer) {
            return;
        }
        clearInterval(this.timer);
        this.timer = null;
    }
    async runOnce() {
        if (this.running) {
            return;
        }
        this.running = true;
        try {
            let cursor;
            while (true) {
                const repos = await this.deps.repositoryRepository.listForPolling(this.options.batchSize, cursor);
                if (repos.length === 0) {
                    break;
                }
                for (const repo of repos) {
                    await this.pollRepository(repo.owner, repo.name, repo.id);
                }
                if (repos.length < this.options.batchSize) {
                    break;
                }
                const last = repos[repos.length - 1];
                cursor = last?.id;
            }
        }
        finally {
            this.running = false;
        }
    }
    async pollRepository(owner, name, repositoryId) {
        const clones = await this.fetchWithRetry(owner, name);
        for (const clone of clones) {
            try {
                await this.deps.cloneMetricRepository.insert({
                    repositoryId,
                    windowStart: clone.timestamp,
                    windowEnd: clone.timestamp,
                    totalClones: clone.count,
                    uniqueCloners: clone.uniques,
                    source: "github_traffic_api",
                    collectedAt: new Date().toISOString(),
                });
            }
            catch (error) {
                if (!isDuplicateKeyError(error)) {
                    throw error;
                }
            }
        }
    }
    async fetchWithRetry(owner, repo) {
        let lastError;
        for (let attempt = 1; attempt <= this.options.retryAttempts; attempt += 1) {
            try {
                return await this.deps.githubTrafficClient.getCloneTraffic(owner, repo);
            }
            catch (error) {
                lastError = error;
                if (attempt < this.options.retryAttempts) {
                    await sleep(this.options.retryDelayMs * attempt);
                }
            }
        }
        throw lastError;
    }
}
//# sourceMappingURL=poller.js.map