import { createHash, randomBytes } from "node:crypto";
export function generateProjectToken(bytes) {
    return randomBytes(bytes).toString("base64url");
}
export function hashProjectToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
//# sourceMappingURL=token.js.map