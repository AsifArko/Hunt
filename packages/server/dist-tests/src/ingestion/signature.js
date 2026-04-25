import { createHmac } from "node:crypto";
import { HttpError } from "../http/errors.js";
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const entries = Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]));
    const parts = entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${parts.join(",")}}`;
}
function sign(secret, algorithm, message) {
    return createHmac(algorithm, secret).update(message).digest("hex");
}
export class SignatureVerifier {
    options;
    constructor(options) {
        this.options = options;
    }
    verify(input) {
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
export function computeSignatureForTesting(input) {
    const canonicalPayload = stableStringify(input.payload);
    return sign(input.secret, "sha256", `${input.timestamp}.${canonicalPayload}`);
}
//# sourceMappingURL=signature.js.map