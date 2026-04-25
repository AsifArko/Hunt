const WEIGHT = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
function shouldLog(minLevel, level) {
    return WEIGHT[level] >= WEIGHT[minLevel];
}
function serializeContext(context) {
    if (!context || Object.keys(context).length === 0) {
        return "";
    }
    return ` ${JSON.stringify(context)}`;
}
export function createConsoleLogger(minLevel) {
    return {
        debug(message, context) {
            if (shouldLog(minLevel, "debug")) {
                console.debug(`[debug] ${message}${serializeContext(context)}`);
            }
        },
        info(message, context) {
            if (shouldLog(minLevel, "info")) {
                console.info(`[info] ${message}${serializeContext(context)}`);
            }
        },
        warn(message, context) {
            if (shouldLog(minLevel, "warn")) {
                console.warn(`[warn] ${message}${serializeContext(context)}`);
            }
        },
        error(message, context) {
            if (shouldLog(minLevel, "error")) {
                console.error(`[error] ${message}${serializeContext(context)}`);
            }
        },
    };
}
//# sourceMappingURL=logger.js.map