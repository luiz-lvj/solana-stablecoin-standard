"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookStore = void 0;
/**
 * Lightweight in-memory registry for webhook subscriptions and delivery
 * tracking. All token data lives on-chain — this only holds runtime config
 * that has no blockchain equivalent.
 */
class WebhookStore {
    webhooks = new Map();
    deliveries = [];
    addWebhook(wh) {
        this.webhooks.set(wh.id, wh);
    }
    getWebhooks() {
        return [...this.webhooks.values()];
    }
    getWebhook(id) {
        return this.webhooks.get(id);
    }
    removeWebhook(id) {
        return this.webhooks.delete(id);
    }
    addDelivery(d) {
        this.deliveries.push(d);
    }
    getDeliveries(webhookId) {
        let out = [...this.deliveries].reverse();
        if (webhookId)
            out = out.filter((d) => d.webhookId === webhookId);
        return out;
    }
}
exports.WebhookStore = WebhookStore;
//# sourceMappingURL=store.js.map