/**
 * @module shared/config
 * @description Service configuration loader with env var support.
 */

export interface ServiceConfig {
    port: number;
    host: string;
    databaseUrl: string;
    redisUrl: string;
    rpcUrl: string;
    programId: string;
    hookProgramId: string;
    logLevel: string;
}

/**
 * Loads service configuration from environment variables.
 */
export function loadServiceConfig(defaults?: Partial<ServiceConfig>): ServiceConfig {
    return {
        port: parseInt(process.env.PORT ?? String(defaults?.port ?? 3000), 10),
        host: process.env.HOST ?? defaults?.host ?? "0.0.0.0",
        databaseUrl: process.env.DATABASE_URL ?? defaults?.databaseUrl ?? "",
        redisUrl: process.env.REDIS_URL ?? defaults?.redisUrl ?? "redis://localhost:6379",
        rpcUrl: process.env.SOLANA_RPC_URL ?? defaults?.rpcUrl ?? "https://api.devnet.solana.com",
        programId: process.env.SSS_PROGRAM_ID ?? defaults?.programId ?? "SSSToken11111111111111111111111111111111111",
        hookProgramId: process.env.SSS_HOOK_PROGRAM_ID ?? defaults?.hookProgramId ?? "Hook111111111111111111111111111111111111111",
        logLevel: process.env.LOG_LEVEL ?? defaults?.logLevel ?? "info",
    };
}
