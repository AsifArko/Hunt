type NodeEnv = "development" | "test" | "production";
type LogLevel = "debug" | "info" | "warn" | "error";
export interface HuntConfig {
    nodeEnv: NodeEnv;
    port: number;
    mongodb: {
        uri: string;
        dbName: string;
    };
    github: {
        clientId: string;
        clientSecret: string;
    };
    auth: {
        jwtSecret: string;
    };
    security: {
        signingSecret: string;
    };
    logging: {
        level: LogLevel;
    };
}
export declare class ConfigValidationError extends Error {
    readonly issues: string[];
    constructor(issues: string[]);
}
export declare function loadConfig(source?: NodeJS.ProcessEnv): Readonly<HuntConfig>;
export {};
//# sourceMappingURL=config.d.ts.map