"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenRoutes = tokenRoutes;
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
function tokenRoutes(ctx) {
    const router = (0, express_1.Router)();
    router.get("/api/v1/status", async (_req, res, next) => {
        try {
            const status = await ctx.stablecoin.getStatus();
            res.json({
                mint: status.mint.toBase58(),
                supply: {
                    raw: status.supply.raw.toString(),
                    uiAmount: status.supply.uiAmount,
                    decimals: status.supply.decimals,
                },
                mintAuthority: status.mintAuthority?.toBase58() ?? null,
                freezeAuthority: status.freezeAuthority?.toBase58() ?? null,
            });
        }
        catch (err) {
            next(err);
        }
    });
    router.post("/api/v1/freeze", async (req, res, next) => {
        try {
            const { tokenAccount } = req.body;
            if (!tokenAccount) {
                res.status(400).json({ error: "tokenAccount is required." });
                return;
            }
            const sig = await ctx.stablecoin.freeze({
                tokenAccount: new web3_js_1.PublicKey(tokenAccount),
                freezeAuthority: ctx.authority,
            });
            res.json({ txSignature: sig });
        }
        catch (err) {
            next(err);
        }
    });
    router.post("/api/v1/thaw", async (req, res, next) => {
        try {
            const { tokenAccount } = req.body;
            if (!tokenAccount) {
                res.status(400).json({ error: "tokenAccount is required." });
                return;
            }
            const sig = await ctx.stablecoin.thaw({
                tokenAccount: new web3_js_1.PublicKey(tokenAccount),
                freezeAuthority: ctx.authority,
            });
            res.json({ txSignature: sig });
        }
        catch (err) {
            next(err);
        }
    });
    router.post("/api/v1/set-authority", async (req, res, next) => {
        try {
            const { type, newAuthority } = req.body;
            if (!type) {
                res.status(400).json({ error: "type is required." });
                return;
            }
            const sig = await ctx.stablecoin.setAuthority({
                type: type,
                currentAuthority: ctx.authority,
                newAuthority: newAuthority && newAuthority !== "none"
                    ? new web3_js_1.PublicKey(newAuthority)
                    : null,
            });
            res.json({ txSignature: sig });
        }
        catch (err) {
            next(err);
        }
    });
    router.get("/api/v1/audit-log", async (req, res, next) => {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : 20;
            const log = await ctx.stablecoin.getAuditLog(limit);
            res.json(log.map((e) => ({
                signature: e.signature,
                slot: e.slot,
                err: e.err,
                blockTime: e.blockTime?.toISOString() ?? null,
            })));
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=token.js.map