import type {
  IdentityClaimRepository,
  RepositoryRepository,
  SignalRepository,
} from "@hunt/core";

import { HttpError } from "../http/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";
import { InMemoryRateLimiter } from "./rate-limit.js";
import { sanitizeSignalInput } from "./sanitize.js";
import { SignatureVerifier } from "./signature.js";

interface IngestionConfig {
  signatureSecret: string;
  signatureMaxAgeSeconds: number;
  maxRequestsPerMinute: number;
}

interface IngestionDependencies {
  repositoryRepository: RepositoryRepository;
  signalRepository: SignalRepository;
  identityClaimRepository: IdentityClaimRepository;
}

type MetadataValue = string | number | boolean | null;

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  return value.trim();
}

function readOptionalRecord(
  value: unknown,
  field: string,
): Record<string, MetadataValue> {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an object.`);
  }
  return value as Record<string, MetadataValue>;
}

export class IngestionService {
  private readonly signatureVerifier: SignatureVerifier;
  private readonly rateLimiter: InMemoryRateLimiter;

  public constructor(
    private readonly config: IngestionConfig,
    private readonly deps: IngestionDependencies,
  ) {
    this.signatureVerifier = new SignatureVerifier({
      secret: config.signatureSecret,
      algorithm: "sha256",
      maxAgeSeconds: config.signatureMaxAgeSeconds,
    });
    this.rateLimiter = new InMemoryRateLimiter(
      config.maxRequestsPerMinute,
      60_000,
    );
  }

  public async ingestSignal(params: {
    payload: unknown;
    signature: string | undefined;
    timestamp: string | undefined;
    idempotencyKey: string | undefined;
  }): Promise<{ signal: unknown; idempotentReplay: boolean }> {
    if (!params.signature || !params.timestamp) {
      throw new HttpError(401, "INVALID_SIGNATURE", "Missing signature headers.");
    }
    this.signatureVerifier.verify({
      payload: params.payload,
      signature: params.signature,
      timestamp: params.timestamp,
    });

    if (typeof params.payload !== "object" || params.payload === null) {
      throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
    }

    const body = params.payload as Record<string, unknown>;
    const repositoryId = requireText(body.repositoryId, "repositoryId");
    this.rateLimiter.check(repositoryId);

    const repository = await this.deps.repositoryRepository.findById(repositoryId);
    if (!repository) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }

    const idempotencyKey = params.idempotencyKey?.trim();
    if (idempotencyKey) {
      const existing = await this.deps.signalRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return {
          signal: existing,
          idempotentReplay: true,
        };
      }
    }

    const sanitizeInput = {
      metadata: readOptionalRecord(body.metadata, "metadata"),
      ...(typeof body.ip === "string" ? { ip: body.ip } : {}),
      ...(typeof body.userAgent === "string"
        ? { userAgent: body.userAgent }
        : {}),
      ...(typeof body.fingerprint === "string"
        ? { fingerprint: body.fingerprint }
        : {}),
    };
    const sanitized = sanitizeSignalInput(sanitizeInput);
    const metadata = {
      ...sanitized.metadata,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    const signalPayload = {
      repositoryId: repository.id,
      eventType: requireText(body.eventType, "eventType"),
      eventTimestamp:
        typeof body.eventTimestamp === "string"
          ? body.eventTimestamp
          : new Date().toISOString(),
      metadata,
      ...(typeof body.sessionId === "string" && body.sessionId.length > 0
        ? { sessionId: body.sessionId }
        : {}),
      ...(sanitized.fingerprintHash
        ? { fingerprintHash: sanitized.fingerprintHash }
        : {}),
      ...(sanitized.ipHash ? { ipHash: sanitized.ipHash } : {}),
      ...(sanitized.userAgentHash
        ? { userAgentHash: sanitized.userAgentHash }
        : {}),
    };

    const signal = await this.deps.signalRepository.insert(signalPayload);

    return { signal, idempotentReplay: false };
  }

  public async createClaim(
    actor: AuthenticatedUser,
    payload: unknown,
  ): Promise<unknown> {
    if (typeof payload !== "object" || payload === null) {
      throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
    }
    const body = payload as Record<string, unknown>;
    const repositoryId = requireText(body.repositoryId, "repositoryId");
    const repository = await this.deps.repositoryRepository.findById(repositoryId);
    if (!repository) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }

    const proofType =
      body.proofType === "signed_message" ? "signed_message" : "oauth_challenge";
    const proofPayload = readOptionalRecord(body.proofPayload, "proofPayload");
    if (Object.keys(proofPayload).length === 0) {
      throw new HttpError(400, "VALIDATION_ERROR", "proofPayload cannot be empty.");
    }

    return this.deps.identityClaimRepository.insert({
      repositoryId,
      userId: actor.id,
      claimTimestamp: new Date().toISOString(),
      proofType,
      proofPayload,
      confidenceLevel: "medium",
      verificationStatus: "pending",
    });
  }
}
