import { mapAuditLogFromDocument, mapAuditLogToDocument, mapCloneMetricFromDocument, mapCloneMetricToDocument, mapIdentityClaimFromDocument, mapIdentityClaimToDocument, mapRepositoryFromDocument, mapRepositoryToDocument, mapSignalFromDocument, mapSignalToDocument, mapUserFromDocument, mapUserToDocument, mongoId, } from "./mappers.js";
function nowIso() {
    return new Date().toISOString();
}
function parseCursor(cursor) {
    if (!cursor) {
        return undefined;
    }
    return mongoId.toObjectId(cursor);
}
function requireExisting(value, message) {
    if (!value) {
        throw new Error(message);
    }
    return value;
}
export class MongoUserRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async create(input) {
        const now = nowIso();
        const document = mapUserToDocument({
            ...input,
            createdAt: now,
            updatedAt: now,
        });
        await this.collections.users.insertOne(document);
        return mapUserFromDocument(document);
    }
    async findById(id) {
        const document = await this.collections.users.findOne({ _id: mongoId.toObjectId(id) });
        return document ? mapUserFromDocument(document) : null;
    }
    async findByGithubId(githubId) {
        const document = await this.collections.users.findOne({ githubId });
        return document ? mapUserFromDocument(document) : null;
    }
    async update(id, patch) {
        const updatedAt = nowIso();
        const result = await this.collections.users.findOneAndUpdate({ _id: mongoId.toObjectId(id) }, { $set: { ...patch, updatedAt } }, { returnDocument: "after" });
        return mapUserFromDocument(requireExisting(result, `User not found: ${id}`));
    }
}
export class MongoRepositoryRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async create(input) {
        const now = nowIso();
        const document = mapRepositoryToDocument({
            ...input,
            createdAt: now,
            updatedAt: now,
        });
        await this.collections.repositories.insertOne(document);
        return mapRepositoryFromDocument(document);
    }
    async findById(id) {
        const document = await this.collections.repositories.findOne({
            _id: mongoId.toObjectId(id),
        });
        return document ? mapRepositoryFromDocument(document) : null;
    }
    async findByOwnerAndName(owner, name) {
        const document = await this.collections.repositories.findOne({ owner, name });
        return document ? mapRepositoryFromDocument(document) : null;
    }
    async listByOwnerId(ownerId, limit, cursor) {
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
    async listForPolling(limit, cursor) {
        const objectIdCursor = parseCursor(cursor);
        const filter = objectIdCursor ? { _id: { $lt: objectIdCursor } } : {};
        const documents = await this.collections.repositories
            .find(filter)
            .sort({ _id: -1 })
            .limit(limit)
            .toArray();
        return documents.map(mapRepositoryFromDocument);
    }
    async update(id, patch) {
        const updatedAt = nowIso();
        const result = await this.collections.repositories.findOneAndUpdate({ _id: mongoId.toObjectId(id) }, { $set: { ...patch, updatedAt } }, { returnDocument: "after" });
        return mapRepositoryFromDocument(requireExisting(result, `Repository not found: ${id}`));
    }
}
export class MongoCloneMetricRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async insert(metric) {
        const document = mapCloneMetricToDocument(metric);
        await this.collections.cloneMetrics.insertOne(document);
        return mapCloneMetricFromDocument(document);
    }
    async listByRepository(repositoryId, range) {
        const filter = { repositoryId };
        if (range?.from || range?.to) {
            filter.windowStart = {};
            if (range.from) {
                filter.windowStart.$gte = range.from;
            }
            if (range.to) {
                filter.windowStart.$lte = range.to;
            }
        }
        const documents = await this.collections.cloneMetrics
            .find(filter)
            .sort({ windowStart: 1 })
            .toArray();
        return documents.map(mapCloneMetricFromDocument);
    }
}
export class MongoSignalRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async insert(signal) {
        const idempotencyKey = typeof signal.metadata.idempotencyKey === "string"
            ? signal.metadata.idempotencyKey
            : undefined;
        const document = idempotencyKey
            ? mapSignalToDocument(signal, { idempotencyKey })
            : mapSignalToDocument(signal);
        await this.collections.signals.insertOne(document);
        return mapSignalFromDocument(document);
    }
    async findByIdempotencyKey(idempotencyKey) {
        const document = await this.collections.signals.findOne({ idempotencyKey });
        return document ? mapSignalFromDocument(document) : null;
    }
}
export class MongoIdentityClaimRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async insert(claim) {
        const document = mapIdentityClaimToDocument(claim);
        await this.collections.identityClaims.insertOne(document);
        return mapIdentityClaimFromDocument(document);
    }
    async listByRepository(repositoryId, limit, cursor) {
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
    async updateStatus(id, status) {
        const result = await this.collections.identityClaims.findOneAndUpdate({ _id: mongoId.toObjectId(id) }, { $set: { verificationStatus: status, updatedAt: nowIso() } }, { returnDocument: "after" });
        return mapIdentityClaimFromDocument(requireExisting(result, `Identity claim not found: ${id}`));
    }
}
export class MongoAuditLogRepository {
    collections;
    constructor(collections) {
        this.collections = collections;
    }
    async insert(log) {
        const document = mapAuditLogToDocument(log);
        await this.collections.auditLogs.insertOne(document);
        return mapAuditLogFromDocument(document);
    }
}
export function createMongoRepositories(collections) {
    return {
        users: new MongoUserRepository(collections),
        repositories: new MongoRepositoryRepository(collections),
        cloneMetrics: new MongoCloneMetricRepository(collections),
        signals: new MongoSignalRepository(collections),
        identityClaims: new MongoIdentityClaimRepository(collections),
        auditLogs: new MongoAuditLogRepository(collections),
    };
}
//# sourceMappingURL=repositories.js.map