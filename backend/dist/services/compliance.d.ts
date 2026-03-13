import type { SolanaContext } from "../solana";
import type pino from "pino";
import type { BlacklistStatus } from "sss-token-sdk";
/**
 * SSS-2 compliance operations — blacklist management.
 * Delegates to the SDK; all state lives on-chain.
 */
export declare class ComplianceService {
    private ctx;
    private logger;
    constructor(ctx: SolanaContext, logger: pino.Logger);
    private requireCompliance;
    blacklistAdd(wallet: string, reason?: string): Promise<{
        txSignature: string;
    }>;
    blacklistRemove(wallet: string, reason?: string): Promise<{
        txSignature: string;
    }>;
    isBlacklisted(wallet: string): Promise<BlacklistStatus>;
}
