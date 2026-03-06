/**
 * @module shared/logger
 * @description Structured logging for backend services.
 */

export interface Logger {
    debug(msg: string, data?: Record<string, unknown>): void;
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Creates a structured logger for a service.
 */
export function createLogger(service: string): Logger {
    const log = (level: string, msg: string, data?: Record<string, unknown>) => {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service,
            msg,
            ...(data ?? {}),
        };
        if (level === "error") {
            console.error(JSON.stringify(entry));
        } else {
            console.log(JSON.stringify(entry));
        }
    };

    return {
        debug: (msg, data) => log("debug", msg, data),
        info: (msg, data) => log("info", msg, data),
        warn: (msg, data) => log("warn", msg, data),
        error: (msg, data) => log("error", msg, data),
    };
}
