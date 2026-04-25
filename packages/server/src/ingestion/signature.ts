import { createHmac } from "node:crypto";

import { HttpError } from "../http/errors.js";

export interface SignatureVerificationInput {
  payload: unknown;
  timestamp: string;
  signature: string;
}

export interface SignatureVerifierOptions {
  secret: string;
  algorithm: "sha256";
  maxAgeSeconds: number;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const parts = entries.map(
    ([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`,
  );
  return `{${parts.join(",")}}`;
}

function sign(secret: string, algorithm: "sha256", message: string): string {
  return createHmac(algorithm, secret).update(message).digest("hex");
}

export class SignatureVerifier {
  public constructor(private readonly options: SignatureVerifierOptions) {}

  public verify(input: SignatureVerificationInput): void {
    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts)) {
      throw new HttpError(401, "INVALID_SIGNATURE", "Signature timestamp is invalid.");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - ts) > this.options.maxAgeSeconds) {
      throw new HttpError(401, "INVALID_SIGNATURE", "Signature timestamp is expired.");
    }

    const canonicalPayload = stableStringify(input.payload);
    const base = `${input.timestamp}.${canonicalPayload}`;
    const expected = sign(this.options.secret, this.options.algorithm, base);
    if (expected !== input.signature) {
      throw new HttpError(401, "INVALID_SIGNATURE", "Signature verification failed.");
    }
  }
}

export function computeSignatureForTesting(input: {
  secret: string;
  timestamp: string;
  payload: unknown;
}): string {
  const canonicalPayload = stableStringify(input.payload);
  return sign(input.secret, "sha256", `${input.timestamp}.${canonicalPayload}`);
}
