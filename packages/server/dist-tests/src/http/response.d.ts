import type { ServerResponse } from "node:http";
export declare function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void;
export declare function sendErrorJson(res: ServerResponse, statusCode: number, code: string, message: string, requestId: string): void;
//# sourceMappingURL=response.d.ts.map