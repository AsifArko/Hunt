import { sendJson } from "../http/response.js";
export const healthHandler = (ctx) => {
    sendJson(ctx.res, 200, {
        status: "ok",
        service: "@hunt/server",
    });
};
//# sourceMappingURL=health.js.map