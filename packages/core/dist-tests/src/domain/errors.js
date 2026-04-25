export class DomainError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "DomainError";
        this.code = code;
        if (details !== undefined) {
            this.details = details;
        }
    }
}
//# sourceMappingURL=errors.js.map