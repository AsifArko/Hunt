import { ObjectId } from "mongodb";

import type {
  AuditLog,
  CloneMetric,
  IdentityClaim,
  Repository,
  Signal,
  User,
} from "@hunt/core";

import type {
  AuditLogDocument,
  CloneMetricDocument,
  IdentityClaimDocument,
  RepositoryDocument,
  SignalDocument,
  UserDocument,
} from "./models.js";

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new ObjectId(id);
}

export function mapUserToDocument(input: Omit<User, "id">): UserDocument {
  return {
    _id: new ObjectId(),
    ...input,
  };
}

export function mapUserFromDocument(document: UserDocument): User {
  const user: User = {
    id: document._id.toHexString(),
    githubId: document.githubId,
    username: document.username,
    oauthScopes: document.oauthScopes,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
  if (document.avatarUrl) {
    user.avatarUrl = document.avatarUrl;
  }
  return user;
}

export function mapRepositoryToDocument(input: Omit<Repository, "id">): RepositoryDocument {
  return {
    _id: new ObjectId(),
    ...input,
  };
}

export function mapRepositoryFromDocument(document: RepositoryDocument): Repository {
  return {
    id: document._id.toHexString(),
    owner: document.owner,
    name: document.name,
    githubRepoId: document.githubRepoId,
    defaultBranch: document.defaultBranch,
    projectTokenHash: document.projectTokenHash,
    settings: document.settings,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function mapCloneMetricToDocument(input: Omit<CloneMetric, "id">): CloneMetricDocument {
  return {
    _id: new ObjectId(),
    ...input,
  };
}

export function mapCloneMetricFromDocument(document: CloneMetricDocument): CloneMetric {
  return {
    id: document._id.toHexString(),
    repositoryId: document.repositoryId,
    windowStart: document.windowStart,
    windowEnd: document.windowEnd,
    totalClones: document.totalClones,
    uniqueCloners: document.uniqueCloners,
    source: document.source,
    collectedAt: document.collectedAt,
  };
}

export function mapSignalToDocument(
  input: Omit<Signal, "id" | "createdAt">,
  options?: { idempotencyKey?: string },
): SignalDocument {
  const document: SignalDocument = {
    _id: new ObjectId(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  if (options?.idempotencyKey) {
    document.idempotencyKey = options.idempotencyKey;
  }
  return document;
}

export function mapSignalFromDocument(document: SignalDocument): Signal {
  const signal: Signal = {
    id: document._id.toHexString(),
    repositoryId: document.repositoryId,
    eventType: document.eventType,
    eventTimestamp: document.eventTimestamp,
    metadata: document.metadata,
    createdAt: document.createdAt,
  };
  if (document.sessionId) {
    signal.sessionId = document.sessionId;
  }
  if (document.fingerprintHash) {
    signal.fingerprintHash = document.fingerprintHash;
  }
  if (document.ipHash) {
    signal.ipHash = document.ipHash;
  }
  if (document.userAgentHash) {
    signal.userAgentHash = document.userAgentHash;
  }
  return signal;
}

export function mapIdentityClaimToDocument(
  input: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">,
): IdentityClaimDocument {
  const now = new Date().toISOString();
  return {
    _id: new ObjectId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

export function mapIdentityClaimFromDocument(document: IdentityClaimDocument): IdentityClaim {
  return {
    id: document._id.toHexString(),
    repositoryId: document.repositoryId,
    userId: document.userId,
    claimTimestamp: document.claimTimestamp,
    proofType: document.proofType,
    proofPayload: document.proofPayload,
    confidenceLevel: document.confidenceLevel,
    verificationStatus: document.verificationStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function mapAuditLogToDocument(input: Omit<AuditLog, "id" | "createdAt">): AuditLogDocument {
  return {
    _id: new ObjectId(),
    ...input,
    createdAt: new Date().toISOString(),
  };
}

export function mapAuditLogFromDocument(document: AuditLogDocument): AuditLog {
  const log: AuditLog = {
    id: document._id.toHexString(),
    action: document.action,
    targetType: document.targetType,
    metadata: document.metadata,
    createdAt: document.createdAt,
  };
  if (document.actorUserId) {
    log.actorUserId = document.actorUserId;
  }
  if (document.repositoryId) {
    log.repositoryId = document.repositoryId;
  }
  if (document.targetId) {
    log.targetId = document.targetId;
  }
  return log;
}

export const mongoId = {
  toObjectId,
};
