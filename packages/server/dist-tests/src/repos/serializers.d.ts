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
export declare function toRepositoryResponse(repository: Repository): RepositoryResponse;
//# sourceMappingURL=serializers.d.ts.map