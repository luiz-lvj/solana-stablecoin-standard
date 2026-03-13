import { Router } from "express";
import type { MintBurnService } from "../services/mint-burn";
import type { SolanaContext } from "../solana";
export declare function mintRoutes(ctx: SolanaContext, mintBurnService: MintBurnService): Router;
