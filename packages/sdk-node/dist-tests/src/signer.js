import { createHmac } from "node:crypto";
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
export function signPayload(input) {
    const canonicalPayload = stableStringify(input.payload);
    const base = `${input.timestamp}.${canonicalPayload}`;
    return createHmac("sha256", input.secret).update(base).digest("hex");
}
//# sourceMappingURL=signer.js.map