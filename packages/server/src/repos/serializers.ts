import type { Repository } from "@hunt/core";

export interface RepositoryResponse {
  id: string;
  owner: string;
  name: string;
  githubRepoId: string;
  defaultBranch: string;
  settings: Repository["settings"];
  createdAt: string;
  updatedAt: string;
}

export function toRepositoryResponse(repository: Repository): RepositoryResponse {
  return {
    id: repository.id,
    owner: repository.owner,
    name: repository.name,
    githubRepoId: repository.githubRepoId,
    defaultBranch: repository.defaultBranch,
    settings: repository.settings,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
}
