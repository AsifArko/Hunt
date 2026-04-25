import { createServer } from "node:http";
import { createHttpApp } from "./http/app.js";
export async function startServer(config) {
    const app = createHttpApp({ config });
    const server = createServer((req, res) => {
        void app.handle(req, res);
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, () => resolve());
    });
    return {
        server,
        stop: () => new Promise((resolve, reject) => {
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
//# sourceMappingURL=server.js.map