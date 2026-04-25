import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { Router } from "../http/router.js";
import { HttpError } from "../http/errors.js";

const STATIC_BASE = new URL("../../../web/static/", import.meta.url);

function staticFilePath(fileName: string): string {
  return fileURLToPath(new URL(fileName, STATIC_BASE));
}

function contentType(fileName: string): string {
  if (fileName.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (fileName.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (fileName.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  return "application/octet-stream";
}

async function sendStatic(
  res: import("node:http").ServerResponse,
  fileName: string,
): Promise<void> {
  try {
    const data = await readFile(staticFilePath(fileName));
    res.statusCode = 200;
    res.setHeader("content-type", contentType(fileName));
    res.end(data);
  } catch {
    throw new HttpError(404, "NOT_FOUND", "Dashboard asset not found.");
  }
}

export function registerWebRoutes(router: Router): void {
  router.get("/", async (ctx) => {
    ctx.res.statusCode = 302;
    ctx.res.setHeader("location", "/dashboard");
    ctx.res.end();
  });

  router.get("/dashboard", async (ctx) => {
    await sendStatic(ctx.res, "index.html");
  });

  router.get("/dashboard/styles.css", async (ctx) => {
    await sendStatic(ctx.res, "styles.css");
  });

  router.get("/dashboard/app.js", async (ctx) => {
    await sendStatic(ctx.res, "app.js");
  });
}
