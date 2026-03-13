export interface AppConfig {
    port: number;
    logLevel: string;
    solanaRpcUrl: string;
    mintAddress: string;
    tokenProgram: string;
    keypairPath: string | null;
    keypairBase64: string | null;
    transferHookProgramId: string | null;
    blacklistKeypairPath: string | null;
    blacklistKeypairBase64: string | null;
    eventPollIntervalMs: number;
    webhookMaxRetries: number;
    webhookRetryBaseMs: number;
}
export declare function loadAppConfig(): AppConfig;
