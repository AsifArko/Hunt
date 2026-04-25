import { DomainError } from "./errors.js";
const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
function requireNonEmptyString(value, field) {
    if (!value || value.trim().length === 0) {
        throw new DomainError("VALIDATION_ERROR", `${field} is required.`, {
            context: { field },
        });
    }
}
function validateIsoDate(value, field) {
    if (!ISO_DATE_TIME_REGEX.test(value)) {
        throw new DomainError("VALIDATION_ERROR", `${field} must be an ISO8601 UTC datetime string.`, { context: { field, value } });
    }
}
export function validateConnectRepositoryInput(input) {
    requireNonEmptyString(input.owner, "owner");
    requireNonEmptyString(input.name, "name");
    requireNonEmptyString(input.githubRepoId, "githubRepoId");
    requireNonEmptyString(input.defaultBranch, "defaultBranch");
    requireNonEmptyString(input.projectTokenPlaintext, "projectTokenPlaintext");
}
export function validateUpdateRepositorySettingsInput(input) {
    requireNonEmptyString(input.repositoryId, "repositoryId");
    if (Object.keys(input.settings).length === 0) {
        throw new DomainError("VALIDATION_ERROR", "settings must include at least one field to update.", { context: { field: "settings" } });
    }
}
export function validateCreateSignalInput(input) {
    requireNonEmptyString(input.repositoryId, "repositoryId");
    requireNonEmptyString(input.eventType, "eventType");
    validateIsoDate(input.eventTimestamp, "eventTimestamp");
}
export function validateCreateIdentityClaimInput(input) {
    requireNonEmptyString(input.repositoryId, "repositoryId");
    requireNonEmptyString(input.userId, "userId");
    validateIsoDate(input.claimTimestamp, "claimTimestamp");
    if (Object.keys(input.proofPayload).length === 0) {
        throw new DomainError("VALIDATION_ERROR", "proofPayload cannot be empty.", {
            context: { field: "proofPayload" },
        });
    }
}
//# sourceMappingURL=validation.js.map