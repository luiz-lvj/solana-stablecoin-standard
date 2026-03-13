"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintBurnService = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * Thin orchestration layer around the SDK for mint/burn operations.
 * All state lives on-chain — this service adds logging and validation.
 */
class MintBurnService {
    ctx;
    logger;
    constructor(ctx, logger) {
        this.ctx = ctx;
        this.logger = logger;
    }
    async mint(recipient, amount) {
        this.logger.info({ recipient, amount }, "Minting tokens");
        const sig = await this.ctx.stablecoin.mintTokens({
            recipient: new web3_js_1.PublicKey(recipient),
            amount: BigInt(amount),
            minter: this.ctx.authority,
        });
        this.logger.info({ sig }, "Mint completed");
        return { txSignature: sig };
    }
    async burn(amount) {
        this.logger.info({ amount }, "Burning tokens");
        const sig = await this.ctx.stablecoin.burn({
            amount: BigInt(amount),
            owner: this.ctx.authority,
        });
        this.logger.info({ sig }, "Burn completed");
        return { txSignature: sig };
    }
}
exports.MintBurnService = MintBurnService;
//# sourceMappingURL=mint-burn.js.map