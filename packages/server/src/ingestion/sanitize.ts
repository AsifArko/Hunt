import { createHash } from "node:crypto";

const SENSITIVE_METADATA_KEYS = new Set([
  "ip",
  "userAgent",
  "email",
  "fingerprint",
]);

type MetadataValue = string | number | boolean | null;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sanitizeSignalInput(input: {
  metadata?: Record<string, MetadataValue>;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
}): {
  metadata: Record<string, MetadataValue>;
  ipHash?: string;
  userAgentHash?: string;
  fingerprintHash?: string;
} {
  const metadata: Record<string, MetadataValue> = {};
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
