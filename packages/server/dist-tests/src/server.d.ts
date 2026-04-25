import { type Server } from "node:http";
import type { AppConfig } from "./http/app.js";
export interface StartedServer {
    server: Server;
    stop(): Promise<void>;
}
export declare function startServer(config: {
    port: number;
} & AppConfig): Promise<StartedServer>;
//# sourceMappingURL=server.d.ts.map