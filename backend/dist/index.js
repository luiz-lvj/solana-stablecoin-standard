"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const logger_1 = require("./logger");
const solana_1 = require("./solana");
const store_1 = require("./store");
const app_1 = require("./app");
async function main() {
    const config = (0, config_1.loadAppConfig)();
    const logger = (0, logger_1.createLogger)(config.logLevel);
    const ctx = (0, solana_1.initSolana)(config);
    const webhookStore = new store_1.WebhookStore();
    logger.info({
        mint: ctx.stablecoin.mint.toBase58(),
        authority: ctx.authority.publicKey.toBase58(),
        compliance: !!ctx.stablecoin.compliance,
    }, "Solana context initialized");
    const { expressApp, eventListener } = (0, app_1.createApp)({ config, ctx, webhookStore, logger });
    eventListener.start();
    const server = expressApp.listen(config.port, () => {
        logger.info({ port: config.port }, "SSS backend started");
    });
    const shutdown = () => {
        logger.info("Shutting down…");
        eventListener.stop();
        server.close(() => process.exit(0));
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map