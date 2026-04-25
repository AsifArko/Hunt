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

export class ConfigValidationError extends Error {
  public readonly issues: string[];

  public constructor(issues: string[]) {
    super(
      `Configuration validation failed with ${issues.length} issue(s):\n${issues.join("\n")}`,
    );
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

interface ParserContext {
  readonly source: NodeJS.ProcessEnv;
  readonly issues: string[];
}

function createParserContext(source: NodeJS.ProcessEnv): ParserContext {
  return {
    source,
    issues: [],
  };
}

function readRequiredString(ctx: ParserContext, key: string): string {
  const value = ctx.source[key]?.trim();
  if (!value) {
    ctx.issues.push(
      `- ${key} is required and cannot be empty. Set it in your environment or .env file.`,
    );
    return "";
  }
  return value;
}

function readEnum<T extends string>(
  ctx: ParserContext,
  key: string,
  allowedValues: readonly T[],
  fallback?: T,
): T {
  const rawValue = ctx.source[key]?.trim();
  const value = (rawValue || fallback) as T | undefined;

  if (!value) {
    ctx.issues.push(
      `- ${key} is required. Allowed values: ${allowedValues.join(", ")}.`,
    );
    return allowedValues[0] as T;
  }

  if (!allowedValues.includes(value)) {
    ctx.issues.push(
      `- ${key} has invalid value "${value}". Allowed values: ${allowedValues.join(", ")}.`,
    );
    return allowedValues[0] as T;
  }

  return value;
}

function readPositiveInteger(
  ctx: ParserContext,
  key: string,
  fallback?: number,
): number {
  const rawValue = ctx.source[key]?.trim();
  const value = rawValue ?? (fallback !== undefined ? String(fallback) : undefined);

  if (!value) {
    ctx.issues.push(`- ${key} is required and must be a positive integer.`);
    return 0;
  }

  const parsed = Number(value);
  const isInteger = Number.isInteger(parsed);
  if (!isInteger || parsed <= 0) {
    ctx.issues.push(
      `- ${key} must be a positive integer. Received "${value}". Example: 4000.`,
    );
    return 0;
  }

  return parsed;
}

function readMongoUri(ctx: ParserContext, key: string): string {
  const value = readRequiredString(ctx, key);
  if (!value) {
    return value;
  }

  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    ctx.issues.push(
      `- ${key} must start with "mongodb://" or "mongodb+srv://".`,
    );
  }

  return value;
}

function deepFreeze<T extends object>(value: T): Readonly<T> {
  Object.freeze(value);

  for (const key of Object.getOwnPropertyNames(value)) {
    const property = (value as Record<string, unknown>)[key];
    if (property && typeof property === "object" && !Object.isFrozen(property)) {
      deepFreeze(property as object);
    }
  }

  return value;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Readonly<HuntConfig> {
  const ctx = createParserContext(source);

  const config: HuntConfig = {
    nodeEnv: readEnum(ctx, "HUNT_NODE_ENV", ["development", "test", "production"], "development"),
    port: readPositiveInteger(ctx, "HUNT_PORT", 4000),
    mongodb: {
      uri: readMongoUri(ctx, "HUNT_MONGODB_URI"),
      dbName: readRequiredString(ctx, "HUNT_MONGODB_DB_NAME"),
    },
    github: {
      clientId: readRequiredString(ctx, "HUNT_GITHUB_CLIENT_ID"),
      clientSecret: readRequiredString(ctx, "HUNT_GITHUB_CLIENT_SECRET"),
    },
    auth: {
      jwtSecret: readRequiredString(ctx, "HUNT_JWT_SECRET"),
    },
    security: {
      signingSecret: readRequiredString(ctx, "HUNT_SIGNING_SECRET"),
    },
    logging: {
      level: readEnum(ctx, "HUNT_LOG_LEVEL", ["debug", "info", "warn", "error"], "info"),
    },
  };

  if (ctx.issues.length > 0) {
    throw new ConfigValidationError(ctx.issues);
  }

  return deepFreeze(config);
}
