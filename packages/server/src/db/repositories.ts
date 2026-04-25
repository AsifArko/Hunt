import { ObjectId } from "mongodb";

import type {
  AuditLog,
  AuditLogRepository,
  CloneMetric,
  CloneMetricRepository,
  EntityId,
  IdentityClaim,
  IdentityClaimRepository,
  Repository,
  RepositoryRepository,
  Signal,
  SignalRepository,
  User,
  UserRepository,
} from "@hunt/core";

import type { MongoCollections } from "./connection.js";
import {
  mapAuditLogFromDocument,
  mapAuditLogToDocument,
  mapCloneMetricFromDocument,
  mapCloneMetricToDocument,
  mapIdentityClaimFromDocument,
  mapIdentityClaimToDocument,
  mapRepositoryFromDocument,
  mapRepositoryToDocument,
  mapSignalFromDocument,
  mapSignalToDocument,
  mapUserFromDocument,
  mapUserToDocument,
  mongoId,
} from "./mappers.js";

function nowIso(): string {
  return new Date().toISOString();
}

function parseCursor(cursor?: string): ObjectId | undefined {
  if (!cursor) {
    return undefined;
  }
  return mongoId.toObjectId(cursor);
}

function requireExisting<T>(value: T | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export class MongoUserRepository implements UserRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const now = nowIso();
    const document = mapUserToDocument({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    await this.collections.users.insertOne(document);
    return mapUserFromDocument(document);
  }

  public async findById(id: EntityId): Promise<User | null> {
    const document = await this.collections.users.findOne({ _id: mongoId.toObjectId(id) });
    return document ? mapUserFromDocument(document) : null;
  }

  public async findByGithubId(githubId: string): Promise<User | null> {
    const document = await this.collections.users.findOne({ githubId });
    return document ? mapUserFromDocument(document) : null;
  }

  public async update(
    id: EntityId,
    patch: Partial<Omit<User, "id" | "createdAt">>,
  ): Promise<User> {
    const updatedAt = nowIso();
    const result = await this.collections.users.findOneAndUpdate(
      { _id: mongoId.toObjectId(id) },
      { $set: { ...patch, updatedAt } },
      { returnDocument: "after" },
    );
    return mapUserFromDocument(requireExisting(result, `User not found: ${id}`));
  }
}

export class MongoRepositoryRepository implements RepositoryRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async create(
    input: Omit<Repository, "id" | "createdAt" | "updatedAt">,
  ): Promise<Repository> {
    const now = nowIso();
    const document = mapRepositoryToDocument({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    await this.collections.repositories.insertOne(document);
    return mapRepositoryFromDocument(document);
  }

  public async findById(id: EntityId): Promise<Repository | null> {
    const document = await this.collections.repositories.findOne({
      _id: mongoId.toObjectId(id),
    });
    return document ? mapRepositoryFromDocument(document) : null;
  }

  public async findByOwnerAndName(owner: string, name: string): Promise<Repository | null> {
    const document = await this.collections.repositories.findOne({ owner, name });
    return document ? mapRepositoryFromDocument(document) : null;
  }

  public async listByOwnerId(ownerId: EntityId, limit: number, cursor?: string): Promise<Repository[]> {
    const objectIdCursor = parseCursor(cursor);
    const filter = objectIdCursor
      ? { owner: ownerId, _id: { $lt: objectIdCursor } }
      : { owner: ownerId };
    const documents = await this.collections.repositories
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    return documents.map(mapRepositoryFromDocument);
  }

  public async listForPolling(limit: number, cursor?: string): Promise<Repository[]> {
    const objectIdCursor = parseCursor(cursor);
    const filter = objectIdCursor ? { _id: { $lt: objectIdCursor } } : {};
    const documents = await this.collections.repositories
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    return documents.map(mapRepositoryFromDocument);
  }

  public async update(
    id: EntityId,
    patch: Partial<Omit<Repository, "id" | "createdAt">>,
  ): Promise<Repository> {
    const updatedAt = nowIso();
    const result = await this.collections.repositories.findOneAndUpdate(
      { _id: mongoId.toObjectId(id) },
      { $set: { ...patch, updatedAt } },
      { returnDocument: "after" },
    );
    return mapRepositoryFromDocument(requireExisting(result, `Repository not found: ${id}`));
  }
}

export class MongoCloneMetricRepository implements CloneMetricRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async insert(metric: Omit<CloneMetric, "id">): Promise<CloneMetric> {
    const document = mapCloneMetricToDocument(metric);
    await this.collections.cloneMetrics.insertOne(document);
    return mapCloneMetricFromDocument(document);
  }

  public async listByRepository(
    repositoryId: EntityId,
    range?: { from?: string; to?: string },
  ): Promise<CloneMetric[]> {
    const filter: Record<string, unknown> = { repositoryId };
    if (range?.from || range?.to) {
      filter.windowStart = {};
      if (range.from) {
        (filter.windowStart as Record<string, string>).$gte = range.from;
      }
      if (range.to) {
        (filter.windowStart as Record<string, string>).$lte = range.to;
      }
    }

    const documents = await this.collections.cloneMetrics
      .find(filter)
      .sort({ windowStart: 1 })
      .toArray();
    return documents.map(mapCloneMetricFromDocument);
  }
}

export class MongoSignalRepository implements SignalRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async insert(signal: Omit<Signal, "id" | "createdAt">): Promise<Signal> {
    const idempotencyKey =
      typeof signal.metadata.idempotencyKey === "string"
        ? signal.metadata.idempotencyKey
        : undefined;
    const document = idempotencyKey
      ? mapSignalToDocument(signal, { idempotencyKey })
      : mapSignalToDocument(signal);
    await this.collections.signals.insertOne(document);
    return mapSignalFromDocument(document);
  }

  public async findByIdempotencyKey(idempotencyKey: string): Promise<Signal | null> {
    const document = await this.collections.signals.findOne({ idempotencyKey });
    return document ? mapSignalFromDocument(document) : null;
  }
}

export class MongoIdentityClaimRepository implements IdentityClaimRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async insert(
    claim: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">,
  ): Promise<IdentityClaim> {
    const document = mapIdentityClaimToDocument(claim);
    await this.collections.identityClaims.insertOne(document);
    return mapIdentityClaimFromDocument(document);
  }

  public async listByRepository(
    repositoryId: EntityId,
    limit: number,
    cursor?: string,
  ): Promise<IdentityClaim[]> {
    const objectIdCursor = parseCursor(cursor);
    const filter = objectIdCursor
      ? { repositoryId, _id: { $lt: objectIdCursor } }
      : { repositoryId };
    const documents = await this.collections.identityClaims
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    return documents.map(mapIdentityClaimFromDocument);
  }

  public async updateStatus(
    id: EntityId,
    status: IdentityClaim["verificationStatus"],
  ): Promise<IdentityClaim> {
    const result = await this.collections.identityClaims.findOneAndUpdate(
      { _id: mongoId.toObjectId(id) },
      { $set: { verificationStatus: status, updatedAt: nowIso() } },
      { returnDocument: "after" },
    );
    return mapIdentityClaimFromDocument(requireExisting(result, `Identity claim not found: ${id}`));
  }
}

export class MongoAuditLogRepository implements AuditLogRepository {
  public constructor(private readonly collections: MongoCollections) {}

  public async insert(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
    const document = mapAuditLogToDocument(log);
    await this.collections.auditLogs.insertOne(document);
    return mapAuditLogFromDocument(document);
  }
}

export function createMongoRepositories(collections: MongoCollections) {
  return {
    users: new MongoUserRepository(collections),
    repositories: new MongoRepositoryRepository(collections),
    cloneMetrics: new MongoCloneMetricRepository(collections),
    signals: new MongoSignalRepository(collections),
    identityClaims: new MongoIdentityClaimRepository(collections),
    auditLogs: new MongoAuditLogRepository(collections),
  };
}
