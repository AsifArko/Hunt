import {
  MongoClient,
  type Collection,
  type Db,
  type MongoClientOptions,
} from "mongodb";

import type {
  AuditLogDocument,
  CloneMetricDocument,
  IdentityClaimDocument,
  RepositoryDocument,
  SignalDocument,
  UserDocument,
} from "./models.js";

export interface MongoConnectionOptions {
  uri: string;
  dbName: string;
  serverSelectionTimeoutMs?: number;
  connectTimeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface MongoCollections {
  users: Collection<UserDocument>;
  repositories: Collection<RepositoryDocument>;
  cloneMetrics: Collection<CloneMetricDocument>;
  signals: Collection<SignalDocument>;
  identityClaims: Collection<IdentityClaimDocument>;
  auditLogs: Collection<AuditLogDocument>;
}

export interface MongoContext {
  client: MongoClient;
  db: Db;
  collections: MongoCollections;
}

const DEFAULTS = {
  serverSelectionTimeoutMs: 5_000,
  connectTimeoutMs: 5_000,
  maxRetries: 3,
  retryDelayMs: 500,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(options: MongoConnectionOptions): MongoClient {
  const clientOptions: MongoClientOptions = {
    serverSelectionTimeoutMS:
      options.serverSelectionTimeoutMs ?? DEFAULTS.serverSelectionTimeoutMs,
    connectTimeoutMS: options.connectTimeoutMs ?? DEFAULTS.connectTimeoutMs,
  };
  return new MongoClient(options.uri, clientOptions);
}

function getCollections(db: Db): MongoCollections {
  return {
    users: db.collection<UserDocument>("users"),
    repositories: db.collection<RepositoryDocument>("repositories"),
    cloneMetrics: db.collection<CloneMetricDocument>("clone_metrics"),
    signals: db.collection<SignalDocument>("signals"),
    identityClaims: db.collection<IdentityClaimDocument>("identity_claims"),
    auditLogs: db.collection<AuditLogDocument>("audit_logs"),
  };
}

export async function initializeMongoIndexes(collections: MongoCollections): Promise<void> {
  await collections.users.createIndexes([
    { key: { githubId: 1 }, name: "users_githubId_unique", unique: true },
    { key: { username: 1 }, name: "users_username" },
  ]);

  await collections.repositories.createIndexes([
    { key: { owner: 1, name: 1 }, name: "repositories_owner_name_unique", unique: true },
    { key: { githubRepoId: 1 }, name: "repositories_githubRepoId_unique", unique: true },
  ]);

  await collections.cloneMetrics.createIndexes([
    {
      key: { repositoryId: 1, windowStart: 1, windowEnd: 1, source: 1 },
      name: "clone_metrics_repo_window_source_unique",
      unique: true,
    },
    { key: { repositoryId: 1, collectedAt: -1 }, name: "clone_metrics_repo_collectedAt" },
  ]);

  await collections.signals.createIndexes([
    { key: { repositoryId: 1, eventTimestamp: -1 }, name: "signals_repo_eventTimestamp" },
    {
      key: { idempotencyKey: 1 },
      name: "signals_idempotencyKey_unique_sparse",
      unique: true,
      sparse: true,
    },
  ]);

  await collections.identityClaims.createIndexes([
    { key: { repositoryId: 1, createdAt: -1 }, name: "identity_claims_repo_createdAt" },
    { key: { userId: 1, repositoryId: 1 }, name: "identity_claims_user_repo" },
  ]);

  await collections.auditLogs.createIndexes([
    { key: { repositoryId: 1, createdAt: -1 }, name: "audit_logs_repo_createdAt" },
    { key: { actorUserId: 1, createdAt: -1 }, name: "audit_logs_actor_createdAt" },
  ]);
}

export class MongoConnectionManager {
  private readonly options: MongoConnectionOptions;
  private context: MongoContext | null = null;

  public constructor(options: MongoConnectionOptions) {
    this.options = options;
  }

  public async connect(): Promise<MongoContext> {
    if (this.context) {
      return this.context;
    }

    const maxRetries = this.options.maxRetries ?? DEFAULTS.maxRetries;
    const retryDelayMs = this.options.retryDelayMs ?? DEFAULTS.retryDelayMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      const client = createClient(this.options);
      try {
        await client.connect();
        const db = client.db(this.options.dbName);
        const collections = getCollections(db);
        await initializeMongoIndexes(collections);
        this.context = { client, db, collections };
        return this.context;
      } catch (error) {
        lastError = error;
        await client.close();
        if (attempt < maxRetries) {
          await sleep(retryDelayMs * attempt);
        }
      }
    }

    throw new Error(
      `Failed to connect to MongoDB after ${maxRetries} attempt(s).`,
      { cause: lastError },
    );
  }

  public getContext(): MongoContext {
    if (!this.context) {
      throw new Error("MongoDB connection is not initialized. Call connect() first.");
    }
    return this.context;
  }

  public async disconnect(): Promise<void> {
    if (!this.context) {
      return;
    }
    await this.context.client.close();
    this.context = null;
  }
}
