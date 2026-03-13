"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(logger) {
    return (err, _req, res, _next) => {
        logger.error({ err }, "Unhandled error");
        res.status(500).json({ error: err.message || "Internal server error" });
    };
}
//# sourceMappingURL=error-handler.js.map