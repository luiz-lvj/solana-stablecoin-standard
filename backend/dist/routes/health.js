"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const express_1 = require("express");
function healthRoutes(ctx) {
    const router = (0, express_1.Router)();
    router.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    router.get("/ready", async (_req, res) => {
        try {
            const version = await ctx.connection.getVersion();
            res.json({
                status: "ready",
                solana: version,
                mint: ctx.stablecoin.mint.toBase58(),
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(503).json({
                status: "not ready",
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    return router;
}
//# sourceMappingURL=health.js.map