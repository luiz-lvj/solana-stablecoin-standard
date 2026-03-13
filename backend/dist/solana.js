"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadKeypair = loadKeypair;
exports.initSolana = initSolana;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const sss_token_sdk_1 = require("sss-token-sdk");
function resolveKeypairPath(rawPath) {
    const expanded = rawPath.startsWith("~") && process.env.HOME
        ? path_1.default.join(process.env.HOME, rawPath.slice(1))
        : rawPath;
    return path_1.default.resolve(expanded);
}
function loadKeypair(filePath, base64) {
    if (base64) {
        const secret = Uint8Array.from(Buffer.from(base64, "base64"));
        return web3_js_1.Keypair.fromSecretKey(secret);
    }
    if (filePath) {
        const resolved = resolveKeypairPath(filePath);
        if (!fs_1.default.existsSync(resolved)) {
            throw new Error(`Keypair file not found: ${resolved}`);
        }
        const data = JSON.parse(fs_1.default.readFileSync(resolved, "utf8"));
        return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(data));
    }
    throw new Error("No keypair source provided (set SOLANA_KEYPAIR_PATH or SOLANA_KEYPAIR_BASE64).");
}
function initSolana(cfg) {
    const connection = new web3_js_1.Connection(cfg.solanaRpcUrl, "confirmed");
    const tokenProgramId = cfg.tokenProgram === "spl-token-2022" ? spl_token_1.TOKEN_2022_PROGRAM_ID : spl_token_1.TOKEN_PROGRAM_ID;
    const transferHookProgramId = cfg.transferHookProgramId
        ? new web3_js_1.PublicKey(cfg.transferHookProgramId)
        : undefined;
    const stablecoin = sss_token_sdk_1.SolanaStablecoin.load(connection, {
        mint: new web3_js_1.PublicKey(cfg.mintAddress),
        tokenProgramId,
        transferHookProgramId,
    });
    const authority = loadKeypair(cfg.keypairPath, cfg.keypairBase64);
    let blacklistAdmin = null;
    if (cfg.blacklistKeypairPath || cfg.blacklistKeypairBase64) {
        blacklistAdmin = loadKeypair(cfg.blacklistKeypairPath, cfg.blacklistKeypairBase64);
    }
    else if (transferHookProgramId) {
        blacklistAdmin = authority;
    }
    return { connection, stablecoin, authority, blacklistAdmin };
}
//# sourceMappingURL=solana.js.map