"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const uuid_1 = require("uuid");
class WebhookService {
    store;
    logger;
    maxRetries;
    retryBaseMs;
    constructor(store, logger, maxRetries, retryBaseMs) {
        this.store = store;
        this.logger = logger;
        this.maxRetries = maxRetries;
        this.retryBaseMs = retryBaseMs;
    }
    register(url, events, secret) {
        const wh = {
            id: (0, uuid_1.v4)(),
            url,
            events,
            secret,
            active: true,
            createdAt: new Date().toISOString(),
        };
        this.store.addWebhook(wh);
        this.logger.info({ webhookId: wh.id, url, events }, "Webhook registered");
        return wh;
    }
    list() {
        return this.store.getWebhooks();
    }
    get(id) {
        return this.store.getWebhook(id);
    }
    remove(id) {
        const ok = this.store.removeWebhook(id);
        if (ok)
            this.logger.info({ webhookId: id }, "Webhook removed");
        return ok;
    }
    /**
     * Dispatch an event to all webhooks that subscribe to it.
     * Retries with exponential backoff on failure.
     */
    async dispatch(event, payload) {
        const hooks = this.store.getWebhooks().filter((wh) => wh.active && (wh.events.includes("*") || wh.events.includes(event)));
        for (const wh of hooks) {
            this.deliverWithRetry(wh, event, payload).catch((err) => {
                this.logger.error({ webhookId: wh.id, err }, "Webhook delivery ultimately failed");
            });
        }
    }
    async deliverWithRetry(wh, event, payload) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const delivery = {
                webhookId: wh.id,
                event,
                payload,
                attempt,
                status: "pending",
                timestamp: new Date().toISOString(),
            };
            try {
                const headers = { "Content-Type": "application/json" };
                if (wh.secret)
                    headers["x-webhook-secret"] = wh.secret;
                const resp = await fetch(wh.url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ event, payload, timestamp: delivery.timestamp }),
                    signal: AbortSignal.timeout(10_000),
                });
                delivery.httpStatus = resp.status;
                delivery.status = resp.ok ? "delivered" : "failed";
                this.store.addDelivery(delivery);
                if (resp.ok) {
                    this.logger.debug({ webhookId: wh.id, event, attempt }, "Webhook delivered");
                    return;
                }
            }
            catch (err) {
                delivery.status = "failed";
                delivery.error = err instanceof Error ? err.message : String(err);
                this.store.addDelivery(delivery);
            }
            if (attempt < this.maxRetries) {
                const delayMs = this.retryBaseMs * Math.pow(2, attempt - 1);
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
    }
    getDeliveries(webhookId) {
        return this.store.getDeliveries(webhookId);
    }
}
exports.WebhookService = WebhookService;
//# sourceMappingURL=webhook.js.map