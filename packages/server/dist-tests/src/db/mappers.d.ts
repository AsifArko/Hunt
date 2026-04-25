import { ObjectId } from "mongodb";
import type { AuditLog, CloneMetric, IdentityClaim, Repository, Signal, User } from "@hunt/core";
import type { AuditLogDocument, CloneMetricDocument, IdentityClaimDocument, RepositoryDocument, SignalDocument, UserDocument } from "./models.js";
declare function toObjectId(id: string): ObjectId;
export declare function mapUserToDocument(input: Omit<User, "id">): UserDocument;
export declare function mapUserFromDocument(document: UserDocument): User;
export declare function mapRepositoryToDocument(input: Omit<Repository, "id">): RepositoryDocument;
export declare function mapRepositoryFromDocument(document: RepositoryDocument): Repository;
export declare function mapCloneMetricToDocument(input: Omit<CloneMetric, "id">): CloneMetricDocument;
export declare function mapCloneMetricFromDocument(document: CloneMetricDocument): CloneMetric;
export declare function mapSignalToDocument(input: Omit<Signal, "id" | "createdAt">, options?: {
    idempotencyKey?: string;
}): SignalDocument;
export declare function mapSignalFromDocument(document: SignalDocument): Signal;
export declare function mapIdentityClaimToDocument(input: Omit<IdentityClaim, "id" | "createdAt" | "updatedAt">): IdentityClaimDocument;
export declare function mapIdentityClaimFromDocument(document: IdentityClaimDocument): IdentityClaim;
export declare function mapAuditLogToDocument(input: Omit<AuditLog, "id" | "createdAt">): AuditLogDocument;
export declare function mapAuditLogFromDocument(document: AuditLogDocument): AuditLog;
export declare const mongoId: {
    toObjectId: typeof toObjectId;
};
export {};
//# sourceMappingURL=mappers.d.ts.map