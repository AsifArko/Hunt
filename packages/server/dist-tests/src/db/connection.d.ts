import { MongoClient, type Collection, type Db } from "mongodb";
import type { AuditLogDocument, CloneMetricDocument, IdentityClaimDocument, RepositoryDocument, SignalDocument, UserDocument } from "./models.js";
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
export declare function initializeMongoIndexes(collections: MongoCollections): Promise<void>;
export declare class MongoConnectionManager {
    private readonly options;
    private context;
    constructor(options: MongoConnectionOptions);
    connect(): Promise<MongoContext>;
    getContext(): MongoContext;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=connection.d.ts.map