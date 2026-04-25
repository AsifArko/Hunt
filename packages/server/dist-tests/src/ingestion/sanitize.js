import { createHash } from "node:crypto";
const SENSITIVE_METADATA_KEYS = new Set([
    "ip",
    "userAgent",
    "email",
    "fingerprint",
]);
function hashValue(value) {
    return createHash("sha256").update(value).digest("hex");
}
export function sanitizeSignalInput(input) {
    const metadata = {};
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
        if (typeof value === "string" && SENSITIVE_METADATA_KEYS.has(key)) {
            metadata[key] = hashValue(value);
            continue;
        }
        metadata[key] = value;
    }
    return {
        metadata,
        ...(input.ip ? { ipHash: hashValue(input.ip) } : {}),
        ...(input.userAgent ? { userAgentHash: hashValue(input.userAgent) } : {}),
        ...(input.fingerprint ? { fingerprintHash: hashValue(input.fingerprint) } : {}),
    };
}
//# sourceMappingURL=sanitize.js.map