import { HttpError } from "../http/errors.js";
import { generateProjectToken, hashProjectToken } from "./token.js";
import { toRepositoryResponse } from "./serializers.js";
function requireText(value, field) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
    }
    return value.trim();
}
async function fetchAccessibleOwners(actor) {
    const owners = new Set([actor.username]);
    const headers = {
        accept: "application/vnd.github+json",
        "user-agent": "hunt-server",
    };
    const serviceToken = process.env.HUNT_GITHUB_TOKEN?.trim();
    if (serviceToken) {
        headers.authorization = `Bearer ${serviceToken}`;
    }
    try {
        const response = await fetch(`https://api.github.com/users/${actor.username}/orgs`, {
            headers,
        });
        if (!response.ok) {
            return owners;
        }
        const organizations = (await response.json());
        for (const organization of organizations) {
            if (organization.login) {
                owners.add(organization.login);
            }
        }
    }
    catch {
        return owners;
    }
    return owners;
}
export class RepositoryService {
    options;
    constructor(options) {
        this.options = options;
    }
    async connect(actor, payload) {
        if (typeof payload !== "object" || payload === null) {
            throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
        }
        const body = payload;
        const owner = requireText(body.owner, "owner");
        const name = requireText(body.name, "name");
        const githubRepoId = requireText(body.githubRepoId, "githubRepoId");
        const defaultBranch = requireText(body.defaultBranch, "defaultBranch");
        const accessibleOwners = await fetchAccessibleOwners(actor);
        if (!accessibleOwners.has(owner)) {
            throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
        }
        const existing = await this.options.repositoryRepository.findByOwnerAndName(owner, name);
        if (existing) {
            throw new HttpError(409, "CONFLICT", "Repository is already connected.");
        }
        const projectToken = generateProjectToken(this.options.projectTokenBytes);
        const projectTokenHash = hashProjectToken(projectToken);
        const repository = await this.options.repositoryRepository.create({
            owner,
            name,
            githubRepoId,
            defaultBranch,
            projectTokenHash,
            settings: {
                privacyMode: "balanced",
                retentionDays: 30,
                claimPolicy: "manual_review",
            },
        });
        return {
            repository: toRepositoryResponse(repository),
            projectToken,
        };
    }
    async list(actor) {
        const accessibleOwners = await fetchAccessibleOwners(actor);
        const all = await Promise.all(Array.from(accessibleOwners).map((owner) => this.options.repositoryRepository.listByOwnerId(owner, 100)));
        return all.flat().map(toRepositoryResponse);
    }
    async getById(actor, repoId) {
        const repository = await this.options.repositoryRepository.findById(repoId);
        if (!repository) {
            throw new HttpError(404, "NOT_FOUND", "Repository not found.");
        }
        const accessibleOwners = await fetchAccessibleOwners(actor);
        if (!accessibleOwners.has(repository.owner)) {
            throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
        }
        return toRepositoryResponse(repository);
    }
    async updateSettings(actor, repoId, payload) {
        if (typeof payload !== "object" || payload === null) {
            throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
        }
        const body = payload;
        if (body.privacyMode === undefined &&
            body.retentionDays === undefined &&
            body.claimPolicy === undefined) {
            throw new HttpError(400, "VALIDATION_ERROR", "At least one settings field is required.");
        }
        const existing = await this.options.repositoryRepository.findById(repoId);
        if (!existing) {
            throw new HttpError(404, "NOT_FOUND", "Repository not found.");
        }
        const accessibleOwners = await fetchAccessibleOwners(actor);
        if (!accessibleOwners.has(existing.owner)) {
            throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
        }
        const nextSettings = {
            ...existing.settings,
            ...(body.privacyMode ? { privacyMode: body.privacyMode } : {}),
            ...(body.retentionDays !== undefined
                ? { retentionDays: body.retentionDays }
                : {}),
            ...(body.claimPolicy ? { claimPolicy: body.claimPolicy } : {}),
        };
        const updated = await this.options.repositoryRepository.update(repoId, {
            settings: nextSettings,
        });
        return toRepositoryResponse(updated);
    }
    async listCloneMetrics(actor, repoId) {
        if (!this.options.cloneMetricRepository) {
            throw new HttpError(500, "METRICS_DISABLED", "Metrics repository is not configured.");
        }
        const repository = await this.options.repositoryRepository.findById(repoId);
        if (!repository) {
            throw new HttpError(404, "NOT_FOUND", "Repository not found.");
        }
        const accessibleOwners = await fetchAccessibleOwners(actor);
        if (!accessibleOwners.has(repository.owner)) {
            throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
        }
        const metrics = await this.options.cloneMetricRepository.listByRepository(repoId);
        return metrics.map((metric) => ({
            id: metric.id,
            windowStart: metric.windowStart,
            windowEnd: metric.windowEnd,
            totalClones: metric.totalClones,
            uniqueCloners: metric.uniqueCloners,
            source: metric.source,
            collectedAt: metric.collectedAt,
        }));
    }
    async listClaims(actor, repoId) {
        if (!this.options.identityClaimRepository) {
            throw new HttpError(500, "CLAIMS_DISABLED", "Claim repository is not configured.");
        }
        const repository = await this.options.repositoryRepository.findById(repoId);
        if (!repository) {
            throw new HttpError(404, "NOT_FOUND", "Repository not found.");
        }
        const accessibleOwners = await fetchAccessibleOwners(actor);
        if (!accessibleOwners.has(repository.owner)) {
            throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
        }
        const claims = await this.options.identityClaimRepository.listByRepository(repoId, 100);
        return claims.map((claim) => ({
            id: claim.id,
            repositoryId: claim.repositoryId,
            userId: claim.userId,
            claimTimestamp: claim.claimTimestamp,
            proofType: claim.proofType,
            confidenceLevel: claim.confidenceLevel,
            verificationStatus: claim.verificationStatus,
            createdAt: claim.createdAt,
            updatedAt: claim.updatedAt,
        }));
    }
}
//# sourceMappingURL=service.js.map