"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintRoutes = mintRoutes;
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
function mintRoutes(ctx, mintBurnService) {
    const router = (0, express_1.Router)();
    router.post("/api/v1/mint", async (req, res, next) => {
        try {
            const { recipient, amount } = req.body;
            if (!recipient || !amount) {
                res.status(400).json({ error: "recipient and amount are required." });
                return;
            }
            try {
                new web3_js_1.PublicKey(recipient);
            }
            catch {
                res.status(400).json({ error: "Invalid recipient public key." });
                return;
            }
            const result = await mintBurnService.mint(recipient, String(amount));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    });
    router.post("/api/v1/burn", async (req, res, next) => {
        try {
            const { amount } = req.body;
            if (!amount) {
                res.status(400).json({ error: "amount is required." });
                return;
            }
            const result = await mintBurnService.burn(String(amount));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    });
    router.get("/api/v1/supply", async (_req, res, next) => {
        try {
            const supply = await ctx.stablecoin.getSupply();
            res.json({ raw: supply.raw.toString(), uiAmount: supply.uiAmount, decimals: supply.decimals });
        }
        catch (err) {
            next(err);
        }
    });
    router.get("/api/v1/balance/:wallet", async (req, res, next) => {
        try {
            const { wallet } = req.params;
            try {
                new web3_js_1.PublicKey(wallet);
            }
            catch {
                res.status(400).json({ error: "Invalid wallet public key." });
                return;
            }
            const balance = await ctx.stablecoin.getBalance(new web3_js_1.PublicKey(wallet));
            res.json({
                wallet,
                ata: balance.ata.toBase58(),
                raw: balance.raw.toString(),
                uiAmount: balance.uiAmount,
                exists: balance.exists,
            });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=mint.js.map