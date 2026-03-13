"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAppConfig = loadAppConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(key) {
    const val = process.env[key];
    if (!val || val.trim() === "") {
        throw new Error(`Missing required env var: ${key}`);
    }
    return val.trim();
}
function optional(key, fallback) {
    const val = process.env[key];
    return val && val.trim() !== "" ? val.trim() : fallback;
}
function loadAppConfig() {
    return {
        port: Number(optional("PORT", "3000")),
        logLevel: optional("LOG_LEVEL", "info"),
        solanaRpcUrl: required("SOLANA_RPC_URL"),
        mintAddress: required("SOLANA_MINT_ADDRESS"),
        tokenProgram: optional("TOKEN_PROGRAM", "spl-token-2022"),
        keypairPath: process.env.SOLANA_KEYPAIR_PATH?.trim() || null,
        keypairBase64: process.env.SOLANA_KEYPAIR_BASE64?.trim() || null,
        transferHookProgramId: process.env.TRANSFER_HOOK_PROGRAM_ID?.trim() || null,
        blacklistKeypairPath: process.env.BLACKLIST_ADMIN_KEYPAIR_PATH?.trim() || null,
        blacklistKeypairBase64: process.env.BLACKLIST_ADMIN_KEYPAIR_BASE64?.trim() || null,
        eventPollIntervalMs: Number(optional("EVENT_POLL_INTERVAL_MS", "5000")),
        webhookMaxRetries: Number(optional("WEBHOOK_MAX_RETRIES", "5")),
        webhookRetryBaseMs: Number(optional("WEBHOOK_RETRY_BASE_MS", "1000")),
    };
}
//# sourceMappingURL=config.js.map