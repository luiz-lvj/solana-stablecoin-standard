import { Connection, Keypair } from "@solana/web3.js";
import { SolanaStablecoin } from "sss-token-sdk";
import type { AppConfig } from "./config";
export declare function loadKeypair(filePath?: string | null, base64?: string | null): Keypair;
export interface SolanaContext {
    connection: Connection;
    stablecoin: SolanaStablecoin;
    authority: Keypair;
    blacklistAdmin: Keypair | null;
}
export declare function initSolana(cfg: AppConfig): SolanaContext;
