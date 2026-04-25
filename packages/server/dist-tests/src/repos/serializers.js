export function toRepositoryResponse(repository) {
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
//# sourceMappingURL=serializers.js.map