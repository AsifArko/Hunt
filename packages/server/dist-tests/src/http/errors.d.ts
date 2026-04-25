export declare class HttpError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly exposeMessage: boolean;
    constructor(statusCode: number, code: string, message: string, exposeMessage?: boolean);
}
//# sourceMappingURL=errors.d.ts.map