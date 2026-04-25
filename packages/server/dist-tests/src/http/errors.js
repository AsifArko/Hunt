export class HttpError extends Error {
    statusCode;
    code;
    exposeMessage;
    constructor(statusCode, code, message, exposeMessage = true) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.code = code;
        this.exposeMessage = exposeMessage;
    }
}
//# sourceMappingURL=errors.js.map