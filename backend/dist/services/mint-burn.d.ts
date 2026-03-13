import type { SolanaContext } from "../solana";
import type pino from "pino";
/**
 * Thin orchestration layer around the SDK for mint/burn operations.
 * All state lives on-chain — this service adds logging and validation.
 */
export declare class MintBurnService {
    private ctx;
    private logger;
    constructor(ctx: SolanaContext, logger: pino.Logger);
    mint(recipient: string, amount: string): Promise<{
        txSignature: string;
    }>;
    burn(amount: string): Promise<{
        txSignature: string;
    }>;
}
