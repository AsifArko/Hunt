import { requireAuthenticated } from "../auth/middleware.js";
import { HttpError } from "../http/errors.js";
import { sendJson } from "../http/response.js";
import type { Router } from "../http/router.js";
import type { AuthenticatedUser } from "../auth/types.js";
import { IngestionService } from "./service.js";

function requireAuthUser(user: AuthenticatedUser | undefined): AuthenticatedUser {
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return user;
}

export function registerIngestionRoutes(
  router: Router,
  ingestionService: IngestionService,
): void {
  router.post("/v1/signals", async (ctx) => {
    const signature = ctx.req.headers["x-hunt-signature"];
    const timestamp = ctx.req.headers["x-hunt-timestamp"];
    const idempotencyKey = ctx.req.headers["idempotency-key"];
    const result = await ingestionService.ingestSignal({
      payload: ctx.body,
      signature: Array.isArray(signature) ? signature[0] : signature,
      timestamp: Array.isArray(timestamp) ? timestamp[0] : timestamp,
      idempotencyKey: Array.isArray(idempotencyKey)
        ? idempotencyKey[0]
        : idempotencyKey,
    });
    sendJson(ctx.res, result.idempotentReplay ? 200 : 201, result);
  });

  router.post(
    "/v1/claims",
    requireAuthenticated(async (ctx) => {
      const claim = await ingestionService.createClaim(
        requireAuthUser(ctx.auth),
        ctx.body,
      );
      sendJson(ctx.res, 201, { claim });
    }),
  );
}
