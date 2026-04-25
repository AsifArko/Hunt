import { createServer, type Server } from "node:http";

import { createHttpApp } from "./http/app.js";
import type { AppConfig } from "./http/app.js";

export interface StartedServer {
  server: Server;
  stop(): Promise<void>;
}

export async function startServer(
  config: { port: number } & AppConfig,
): Promise<StartedServer> {
  const app = createHttpApp({ config });
  const server = createServer((req, res) => {
    void app.handle(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, () => resolve());
  });

  return {
    server,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
