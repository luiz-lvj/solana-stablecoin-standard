import type { WebhookStore } from "../store";
import type pino from "pino";
import type { WebhookConfig, WebhookDelivery } from "../types";
export declare class WebhookService {
    private store;
    private logger;
    private maxRetries;
    private retryBaseMs;
    constructor(store: WebhookStore, logger: pino.Logger, maxRetries: number, retryBaseMs: number);
    register(url: string, events: string[], secret?: string): WebhookConfig;
    list(): WebhookConfig[];
    get(id: string): WebhookConfig | undefined;
    remove(id: string): boolean;
    /**
     * Dispatch an event to all webhooks that subscribe to it.
     * Retries with exponential backoff on failure.
     */
    dispatch(event: string, payload: unknown): Promise<void>;
    private deliverWithRetry;
    getDeliveries(webhookId?: string): WebhookDelivery[];
}
