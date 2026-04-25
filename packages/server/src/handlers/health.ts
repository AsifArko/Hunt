import { sendJson } from "../http/response.js";
import type { RouteHandler } from "../http/types.js";

export const healthHandler: RouteHandler = (ctx) => {
  sendJson(ctx.res, 200, {
    status: "ok",
    service: "@hunt/server",
  });
};
