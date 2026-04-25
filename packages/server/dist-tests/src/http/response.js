export function sendJson(res, statusCode, payload) {
    if (res.writableEnded) {
        return;
    }
    const body = JSON.stringify(payload);
    res.statusCode = statusCode;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(body);
}
export function sendErrorJson(res, statusCode, code, message, requestId) {
    const payload = {
        error: {
            code,
            message,
            requestId,
        },
    };
    sendJson(res, statusCode, payload);
}
//# sourceMappingURL=response.js.map