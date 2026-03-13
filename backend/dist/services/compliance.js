"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * SSS-2 compliance operations — blacklist management.
 * Delegates to the SDK; all state lives on-chain.
 */
class ComplianceService {
    ctx;
    logger;
    constructor(ctx, logger) {
        this.ctx = ctx;
        this.logger = logger;
    }
    requireCompliance() {
        if (!this.ctx.stablecoin.compliance) {
            throw new Error("Compliance operations require SSS-2 with a transfer hook program.");
        }
        if (!this.ctx.blacklistAdmin) {
            throw new Error("No blacklist admin keypair configured.");
        }
        return {
            compliance: this.ctx.stablecoin.compliance,
            admin: this.ctx.blacklistAdmin,
        };
    }
    async blacklistAdd(wallet, reason) {
        const { compliance, admin } = this.requireCompliance();
        this.logger.info({ wallet, reason }, "Adding wallet to blacklist");
        const sig = await compliance.blacklistAdd(new web3_js_1.PublicKey(wallet), admin);
        this.logger.info({ wallet, sig }, "Wallet blacklisted");
        return { txSignature: sig };
    }
    async blacklistRemove(wallet, reason) {
        const { compliance, admin } = this.requireCompliance();
        this.logger.info({ wallet, reason }, "Removing wallet from blacklist");
        const sig = await compliance.blacklistRemove(new web3_js_1.PublicKey(wallet), admin);
        this.logger.info({ wallet, sig }, "Wallet unblacklisted");
        return { txSignature: sig };
    }
    async isBlacklisted(wallet) {
        const { compliance } = this.requireCompliance();
        return compliance.isBlacklisted(new web3_js_1.PublicKey(wallet));
    }
}
exports.ComplianceService = ComplianceService;
//# sourceMappingURL=compliance.js.map