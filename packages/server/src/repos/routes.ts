import { sendJson } from "../http/response.js";
import type { Router } from "../http/router.js";
import { requireAuthenticated } from "../auth/middleware.js";
import { HttpError } from "../http/errors.js";
import { RepositoryService } from "./service.js";
import type { AuthenticatedUser } from "../auth/types.js";

function requireAuthUser(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return user;
}

interface GithubOrg {
  login?: string;
}

interface GithubRepo {
  id?: number;
  name?: string;
  default_branch?: string;
}

interface GithubBranch {
  name?: string;
}

async function githubGet<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "hunt-dashboard",
  };
  const serviceToken = process.env.HUNT_GITHUB_TOKEN?.trim();
  if (serviceToken) {
    headers.authorization = `Bearer ${serviceToken}`;
  }

  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new HttpError(
      502,
      "GITHUB_API_ERROR",
      "Unable to load repository details from GitHub.",
    );
  }
  return (await response.json()) as T;
}

async function githubDiscoveryHandler(actor: AuthenticatedUser): Promise<{
  owners: string[];
  repositories: Array<{ owner: string; name: string; id: string; defaultBranch: string }>;
  branchMap: Record<string, string[]>;
}> {
  const owners = new Set<string>([actor.username]);
  const organizations = await githubGet<GithubOrg[]>(`/users/${actor.username}/orgs`);
  for (const organization of organizations) {
    if (organization.login) {
      owners.add(organization.login);
    }
  }

  const repositories: Array<{ owner: string; name: string; id: string; defaultBranch: string }> = [];
  const branchMap: Record<string, string[]> = {};

  for (const owner of owners) {
    const repos = await githubGet<GithubRepo[]>(
      `/users/${owner}/repos?per_page=100&type=owner&sort=updated`,
    );
    for (const repo of repos) {
      if (!repo.name || repo.id === undefined) {
        continue;
      }
      const defaultBranch = repo.default_branch || "master";
      repositories.push({
        owner,
        name: repo.name,
        id: String(repo.id),
        defaultBranch,
      });
      const branches = await githubGet<GithubBranch[]>(
        `/repos/${owner}/${repo.name}/branches?per_page=100`,
      );
      branchMap[`${owner}/${repo.name}`] = branches
        .map((branch) => branch.name)
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b));
    }
  }

  return {
    owners: Array.from(owners).sort((a, b) => a.localeCompare(b)),
    repositories: repositories.sort((a, b) => {
      const ownerCompare = a.owner.localeCompare(b.owner);
      if (ownerCompare !== 0) {
        return ownerCompare;
      }
      return a.name.localeCompare(b.name);
    }),
    branchMap,
  };
}

export function registerRepositoryRoutes(
  router: Router,
  repositoryService: RepositoryService,
): void {
  router.post(
    "/v1/repos/connect",
    requireAuthenticated(async (ctx) => {
      const result = await repositoryService.connect(requireAuthUser(ctx.auth), ctx.body);
      sendJson(ctx.res, 201, result);
    }),
  );

  router.get(
    "/v1/repos",
    requireAuthenticated(async (ctx) => {
      const items = await repositoryService.list(requireAuthUser(ctx.auth));
      sendJson(ctx.res, 200, { items });
    }),
  );

  router.get(
    "/v1/repos/discovery/github",
    requireAuthenticated(async (ctx) => {
      const result = await githubDiscoveryHandler(requireAuthUser(ctx.auth));
      sendJson(ctx.res, 200, result);
    }),
  );

  router.get(
    "/v1/repos/:repoId",
    requireAuthenticated(async (ctx) => {
      const repoId = ctx.params.repoId;
      if (!repoId) {
        throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
      }
      const repository = await repositoryService.getById(requireAuthUser(ctx.auth), repoId);
      sendJson(ctx.res, 200, { repository });
    }),
  );

  router.patch(
    "/v1/repos/:repoId/settings",
    requireAuthenticated(async (ctx) => {
      const repoId = ctx.params.repoId;
      if (!repoId) {
        throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
      }
      const repository = await repositoryService.updateSettings(
        requireAuthUser(ctx.auth),
        repoId,
        ctx.body,
      );
      sendJson(ctx.res, 200, { repository });
    }),
  );

  router.get(
    "/v1/repos/:repoId/metrics/clones",
    requireAuthenticated(async (ctx) => {
      const repoId = ctx.params.repoId;
      if (!repoId) {
        throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
      }
      const items = await repositoryService.listCloneMetrics(
        requireAuthUser(ctx.auth),
        repoId,
      );
      sendJson(ctx.res, 200, { items });
    }),
  );

  router.get(
    "/v1/repos/:repoId/claims",
    requireAuthenticated(async (ctx) => {
      const repoId = ctx.params.repoId;
      if (!repoId) {
        throw new HttpError(400, "VALIDATION_ERROR", "repoId path parameter is required.");
      }
      const items = await repositoryService.listClaims(requireAuthUser(ctx.auth), repoId);
      sendJson(ctx.res, 200, { items });
    }),
  );
}
