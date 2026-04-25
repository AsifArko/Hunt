import type { ServerResponse } from "node:http";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  if (res.writableEnded) {
    return;
  }

  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(body);
}

export function sendErrorJson(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
): void {
  const payload: ErrorBody = {
    error: {
      code,
      message,
      requestId,
    },
  };
  sendJson(res, statusCode, payload);
}
