import { HttpError } from "../http/errors.js";
import { InMemoryRateLimiter } from "./rate-limit.js";
import { sanitizeSignalInput } from "./sanitize.js";
import { SignatureVerifier } from "./signature.js";
function requireText(value, field) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
    }
    return value.trim();
}
function readOptionalRecord(value, field) {
    if (value === undefined) {
        return {};
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an object.`);
    }
    return value;
}
export class IngestionService {
    config;
    deps;
    signatureVerifier;
    rateLimiter;
    constructor(config, deps) {
        this.config = config;
        this.deps = deps;
        this.signatureVerifier = new SignatureVerifier({
            secret: config.signatureSecret,
            algorithm: "sha256",
            maxAgeSeconds: config.signatureMaxAgeSeconds,
        });
        this.rateLimiter = new InMemoryRateLimiter(config.maxRequestsPerMinute, 60_000);
    }
    async ingestSignal(params) {
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
        const body = params.payload;
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
            eventTimestamp: typeof body.eventTimestamp === "string"
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
    async createClaim(actor, payload) {
        if (typeof payload !== "object" || payload === null) {
            throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
        }
        const body = payload;
        const repositoryId = requireText(body.repositoryId, "repositoryId");
        const repository = await this.deps.repositoryRepository.findById(repositoryId);
        if (!repository) {
            throw new HttpError(404, "NOT_FOUND", "Repository not found.");
        }
        const proofType = body.proofType === "signed_message" ? "signed_message" : "oauth_challenge";
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
//# sourceMappingURL=service.js.map