import { ObjectId } from "mongodb";
function toObjectId(id) {
    if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new ObjectId(id);
}
export function mapUserToDocument(input) {
    return {
        _id: new ObjectId(),
        ...input,
    };
}
export function mapUserFromDocument(document) {
    const user = {
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
export function mapRepositoryToDocument(input) {
    return {
        _id: new ObjectId(),
        ...input,
    };
}
export function mapRepositoryFromDocument(document) {
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
export function mapCloneMetricToDocument(input) {
    return {
        _id: new ObjectId(),
        ...input,
    };
}
export function mapCloneMetricFromDocument(document) {
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
export function mapSignalToDocument(input, options) {
    const document = {
        _id: new ObjectId(),
        ...input,
        createdAt: new Date().toISOString(),
    };
    if (options?.idempotencyKey) {
        document.idempotencyKey = options.idempotencyKey;
    }
    return document;
}
export function mapSignalFromDocument(document) {
    const signal = {
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
export function mapIdentityClaimToDocument(input) {
    const now = new Date().toISOString();
    return {
        _id: new ObjectId(),
        ...input,
        createdAt: now,
        updatedAt: now,
    };
}
export function mapIdentityClaimFromDocument(document) {
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
export function mapAuditLogToDocument(input) {
    return {
        _id: new ObjectId(),
        ...input,
        createdAt: new Date().toISOString(),
    };
}
export function mapAuditLogFromDocument(document) {
    const log = {
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
//# sourceMappingURL=mappers.js.map