"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const error_handler_1 = require("./middleware/error-handler");
const mint_burn_1 = require("./services/mint-burn");
const compliance_1 = require("./services/compliance");
const webhook_1 = require("./services/webhook");
const event_listener_1 = require("./services/event-listener");
const health_1 = require("./routes/health");
const mint_1 = require("./routes/mint");
const token_1 = require("./routes/token");
const compliance_2 = require("./routes/compliance");
const webhooks_1 = require("./routes/webhooks");
function createApp(deps) {
    const { config, ctx, webhookStore, logger } = deps;
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        logger.debug({ method: req.method, url: req.url }, "request");
        next();
    });
    const mintBurnService = new mint_burn_1.MintBurnService(ctx, logger);
    const complianceService = new compliance_1.ComplianceService(ctx, logger);
    const webhookService = new webhook_1.WebhookService(webhookStore, logger, config.webhookMaxRetries, config.webhookRetryBaseMs);
    const eventListener = new event_listener_1.EventListener(ctx, webhookService, logger, config.eventPollIntervalMs);
    app.use((0, health_1.healthRoutes)(ctx));
    app.use((0, mint_1.mintRoutes)(ctx, mintBurnService));
    app.use((0, token_1.tokenRoutes)(ctx));
    app.use((0, compliance_2.complianceRoutes)(complianceService));
    app.use((0, webhooks_1.webhookRoutes)(webhookService));
    app.use((0, error_handler_1.errorHandler)(logger));
    return { expressApp: app, eventListener, webhookService, mintBurnService, complianceService };
}
//# sourceMappingURL=app.js.map