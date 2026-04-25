import type { ObjectId } from "mongodb";

import type {
  AuditLog,
  CloneMetric,
  IdentityClaim,
  Repository,
  Signal,
  User,
} from "@hunt/core";

type WithoutId<T> = Omit<T, "id">;

export type UserDocument = WithoutId<User> & { _id: ObjectId };
export type RepositoryDocument = WithoutId<Repository> & { _id: ObjectId };
export type CloneMetricDocument = WithoutId<CloneMetric> & { _id: ObjectId };
export type IdentityClaimDocument = WithoutId<IdentityClaim> & { _id: ObjectId };
export type AuditLogDocument = WithoutId<AuditLog> & { _id: ObjectId };

export type SignalDocument = WithoutId<Signal> & {
  _id: ObjectId;
  idempotencyKey?: string;
};
