import { HttpError } from "../http/errors.js";
import type { AuthenticatedUser } from "../auth/types.js";
import type {
  CloneMetricRepository,
  IdentityClaimRepository,
  RepositoryRepository,
} from "@hunt/core";

import { generateProjectToken, hashProjectToken } from "./token.js";
import { toRepositoryResponse, type RepositoryResponse } from "./serializers.js";

interface ConnectRepositoryInput {
  owner: string;
  name: string;
  githubRepoId: string;
  defaultBranch: string;
}

interface UpdateRepositorySettingsInput {
  privacyMode?: "strict" | "balanced";
  retentionDays?: number;
  claimPolicy?: "manual_review" | "auto_review";
}

interface RepositoryServiceOptions {
  repositoryRepository: RepositoryRepository;
  cloneMetricRepository?: CloneMetricRepository;
  identityClaimRepository?: IdentityClaimRepository;
  projectTokenBytes: number;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  return value.trim();
}

function assertOwnerAccess(owner: string, actor: AuthenticatedUser): void {
  if (owner !== actor.username) {
    throw new HttpError(403, "FORBIDDEN", "Repository access denied.");
  }
}

export class RepositoryService {
  public constructor(private readonly options: RepositoryServiceOptions) {}

  public async connect(actor: AuthenticatedUser, payload: unknown): Promise<{
    repository: RepositoryResponse;
    projectToken: string;
  }> {
    if (typeof payload !== "object" || payload === null) {
      throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
    }

    const body = payload as Record<string, unknown>;
    const owner = requireText(body.owner, "owner");
    const name = requireText(body.name, "name");
    const githubRepoId = requireText(body.githubRepoId, "githubRepoId");
    const defaultBranch = requireText(body.defaultBranch, "defaultBranch");

    assertOwnerAccess(owner, actor);

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

  public async list(actor: AuthenticatedUser): Promise<RepositoryResponse[]> {
    const repos = await this.options.repositoryRepository.listByOwnerId(actor.username, 100);
    return repos.map(toRepositoryResponse);
  }

  public async getById(actor: AuthenticatedUser, repoId: string): Promise<RepositoryResponse> {
    const repository = await this.options.repositoryRepository.findById(repoId);
    if (!repository) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }
    assertOwnerAccess(repository.owner, actor);
    return toRepositoryResponse(repository);
  }

  public async updateSettings(
    actor: AuthenticatedUser,
    repoId: string,
    payload: unknown,
  ): Promise<RepositoryResponse> {
    if (typeof payload !== "object" || payload === null) {
      throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
    }
    const body = payload as UpdateRepositorySettingsInput;
    if (
      body.privacyMode === undefined &&
      body.retentionDays === undefined &&
      body.claimPolicy === undefined
    ) {
      throw new HttpError(400, "VALIDATION_ERROR", "At least one settings field is required.");
    }

    const existing = await this.options.repositoryRepository.findById(repoId);
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }
    assertOwnerAccess(existing.owner, actor);

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

  public async listCloneMetrics(
    actor: AuthenticatedUser,
    repoId: string,
  ): Promise<Array<{
    id: string;
    windowStart: string;
    windowEnd: string;
    totalClones: number;
    uniqueCloners: number;
    source: string;
    collectedAt: string;
  }>> {
    if (!this.options.cloneMetricRepository) {
      throw new HttpError(500, "METRICS_DISABLED", "Metrics repository is not configured.");
    }
    const repository = await this.options.repositoryRepository.findById(repoId);
    if (!repository) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }
    assertOwnerAccess(repository.owner, actor);

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

  public async listClaims(
    actor: AuthenticatedUser,
    repoId: string,
  ): Promise<Array<{
    id: string;
    repositoryId: string;
    userId: string;
    claimTimestamp: string;
    proofType: string;
    confidenceLevel: string;
    verificationStatus: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    if (!this.options.identityClaimRepository) {
      throw new HttpError(500, "CLAIMS_DISABLED", "Claim repository is not configured.");
    }
    const repository = await this.options.repositoryRepository.findById(repoId);
    if (!repository) {
      throw new HttpError(404, "NOT_FOUND", "Repository not found.");
    }
    assertOwnerAccess(repository.owner, actor);

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
