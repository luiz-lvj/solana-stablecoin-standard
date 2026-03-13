import type { WebhookConfig, WebhookDelivery } from "./types";
/**
 * Lightweight in-memory registry for webhook subscriptions and delivery
 * tracking. All token data lives on-chain — this only holds runtime config
 * that has no blockchain equivalent.
 */
export declare class WebhookStore {
    private webhooks;
    private deliveries;
    addWebhook(wh: WebhookConfig): void;
    getWebhooks(): WebhookConfig[];
    getWebhook(id: string): WebhookConfig | undefined;
    removeWebhook(id: string): boolean;
    addDelivery(d: WebhookDelivery): void;
    getDeliveries(webhookId?: string): WebhookDelivery[];
}
