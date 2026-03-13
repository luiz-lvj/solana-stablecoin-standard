import express from "express";
import type pino from "pino";
import type { SolanaContext } from "./solana";
import type { WebhookStore } from "./store";
import type { AppConfig } from "./config";
import { MintBurnService } from "./services/mint-burn";
import { ComplianceService } from "./services/compliance";
import { WebhookService } from "./services/webhook";
import { EventListener } from "./services/event-listener";
export interface AppDependencies {
    config: AppConfig;
    ctx: SolanaContext;
    webhookStore: WebhookStore;
    logger: pino.Logger;
}
export interface AppInstance {
    expressApp: express.Application;
    eventListener: EventListener;
    webhookService: WebhookService;
    mintBurnService: MintBurnService;
    complianceService: ComplianceService;
}
export declare function createApp(deps: AppDependencies): AppInstance;
