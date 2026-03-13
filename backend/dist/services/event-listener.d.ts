import type { SolanaContext } from "../solana";
import type { WebhookService } from "./webhook";
import type pino from "pino";
/**
 * Polls the chain for new transactions involving the mint and dispatches
 * events to registered webhooks. In production, consider replacing polling
 * with Solana's `onLogs` WebSocket subscription for lower latency.
 */
export declare class EventListener {
    private ctx;
    private webhookService;
    private logger;
    private pollIntervalMs;
    private intervalId;
    private lastSignature;
    constructor(ctx: SolanaContext, webhookService: WebhookService, logger: pino.Logger, pollIntervalMs: number);
    start(): void;
    stop(): void;
    private poll;
}
