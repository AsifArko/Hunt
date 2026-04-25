import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

import { loadConfig } from "@hunt/core";

import { createMongoRepositories, MongoConnectionManager } from "./db/index.js";
import { createHttpApp } from "./http/app.js";
import { CloneMetricsPoller, GitHubTrafficApiClient } from "./metrics/index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({
  path: resolve(currentDir, "../../../.env"),
});

async function main(): Promise<void> {
  const config = loadConfig();

  const mongo = new MongoConnectionManager({
    uri: config.mongodb.uri,
    dbName: config.mongodb.dbName,
  });
  const context = await mongo.connect();
  const repositories = createMongoRepositories(context.collections);

  const app = createHttpApp({
    config: {
      logging: config.logging,
      auth: {
        githubClientId: config.github.clientId,
        githubClientSecret: config.github.clientSecret,
        jwtSecret: config.auth.jwtSecret,
      },
      repositories: {
        projectTokenBytes: Number(process.env.HUNT_PROJECT_TOKEN_BYTES ?? "24"),
      },
      ingestion: {
        signatureSecret: config.security.signingSecret,
        signatureMaxAgeSeconds: Number(
          process.env.HUNT_SIGNATURE_MAX_AGE_SECONDS ?? "300",
        ),
        maxRequestsPerMinute: Number(
          process.env.HUNT_INGESTION_MAX_REQUESTS_PER_MINUTE ?? "120",
        ),
      },
      http: {
        maxBodyBytes: Number(process.env.HUNT_HTTP_MAX_BODY_BYTES ?? "1048576"),
      },
    },
    authDependencies: {
      userRepository: repositories.users,
    },
    repositoryDependencies: {
      repositoryRepository: repositories.repositories,
      cloneMetricRepository: repositories.cloneMetrics,
      identityClaimRepository: repositories.identityClaims,
    },
    ingestionDependencies: {
      repositoryRepository: repositories.repositories,
      signalRepository: repositories.signals,
      identityClaimRepository: repositories.identityClaims,
    },
  });

  const server = createServer((req, res) => {
    void app.handle(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, () => resolve());
  });

  const githubToken = process.env.HUNT_GITHUB_TOKEN?.trim();
  let poller: CloneMetricsPoller | null = null;
  if (githubToken) {
    poller = new CloneMetricsPoller(
      {
        intervalMs: Number(process.env.HUNT_METRICS_POLL_INTERVAL_MS ?? "60000"),
        batchSize: Number(process.env.HUNT_METRICS_POLL_BATCH_SIZE ?? "20"),
        retryAttempts: Number(process.env.HUNT_METRICS_POLL_RETRY_ATTEMPTS ?? "3"),
        retryDelayMs: Number(process.env.HUNT_METRICS_POLL_RETRY_DELAY_MS ?? "500"),
      },
      {
        repositoryRepository: repositories.repositories,
        cloneMetricRepository: repositories.cloneMetrics,
        githubTrafficClient: new GitHubTrafficApiClient({ githubToken }),
      },
    );
    poller.start();
    await poller.runOnce();
  }

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[hunt] received ${signal}, shutting down...`);
    try {
      if (poller) {
        poller.stop();
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await mongo.disconnect();
      process.exit(0);
    } catch (error) {
      console.error("[hunt] shutdown failed", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.log(`[hunt] server running on http://localhost:${config.port}`);
  console.log(`[hunt] dashboard: http://localhost:${config.port}/dashboard`);
  if (!githubToken) {
    console.log(
      "[hunt] metrics poller disabled (set HUNT_GITHUB_TOKEN to enable GitHub traffic sync).",
    );
  }
}

void main().catch((error) => {
  console.error("[hunt] failed to start server", error);
  process.exit(1);
});
