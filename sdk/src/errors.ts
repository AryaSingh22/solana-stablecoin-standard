/**
 * @module errors
 * @description Error class hierarchy for the SSS SDK.
 *
 * Maps on-chain Anchor error codes to typed JavaScript errors with
 * human-readable messages and recovery suggestions.
 */

/**
 * Base error class for all SSS SDK errors.
 */
export class SSSError extends Error {
    /** The Anchor error code (if from on-chain). */
    public readonly code?: number;
    /** The original error that caused this one. */
    public readonly cause?: Error;

    constructor(message: string, code?: number, cause?: Error) {
        super(message);
        this.name = "SSSError";
        this.code = code;
        this.cause = cause;
        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Alias for `code` — spec requires the field to be named `errorCode`.
     * LOW-002: added getter for spec API surface compatibility.
     */
    get errorCode(): number | undefined {
        return this.code;
    }
}

/**
 * Error thrown when a transaction fails on-chain.
 */
export class TransactionError extends SSSError {
    /** The transaction signature (if available). */
    public readonly signature?: string;
    /** The transaction logs (if available). */
    public readonly logs?: string[];

    constructor(
        message: string,
        code?: number,
        signature?: string,
        logs?: string[],
    ) {
        super(message, code);
        this.name = "TransactionError";
        this.signature = signature;
        this.logs = logs;
    }
}

/**
 * Error thrown when authorization/permission checks fail.
 */
export class AuthorizationError extends SSSError {
    constructor(message: string, code?: number) {
        super(message, code);
        this.name = "AuthorizationError";
    }
}

/**
 * Error thrown when the token is paused and the operation is blocked.
 */
export class TokenPausedError extends SSSError {
    constructor(message = "Token operations are currently paused") {
        super(message);
        this.name = "TokenPausedError";
    }
}

/**
 * Error thrown when a feature is not enabled (e.g., SSS-2 operations on SSS-1).
 */
export class FeatureNotEnabledError extends SSSError {
    constructor(feature: string) {
        super(`Feature "${feature}" is not enabled for this stablecoin`);
        this.name = "FeatureNotEnabledError";
    }
}

/**
 * Error thrown when an account is blacklisted.
 */
export class BlacklistedError extends SSSError {
    constructor(address: string) {
        super(`Account ${address} is blacklisted`);
        this.name = "BlacklistedError";
    }
}

/**
 * Error thrown when a minter exceeds their quota.
 */
export class QuotaExceededError extends SSSError {
    /** The current quota limit. */
    public readonly limit: bigint;
    /** The amount already used. */
    public readonly used: bigint;
    /** The amount that was attempted. */
    public readonly attempted: bigint;

    constructor(limit: bigint, used: bigint, attempted: bigint) {
        super(
            `Minter quota exceeded: limit=${limit}, used=${used}, attempted=${attempted}`,
        );
        this.name = "QuotaExceededError";
        this.limit = limit;
        this.used = used;
        this.attempted = attempted;
    }
}

/**
 * Error thrown for invalid configuration or arguments.
 */
export class ConfigError extends SSSError {
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

/**
 * Error thrown when an account is not found on-chain.
 */
export class AccountNotFoundError extends SSSError {
    constructor(accountType: string, address: string) {
        super(`${accountType} account not found: ${address}`);
        this.name = "AccountNotFoundError";
    }
}

// ============================================================================
// Error Code Mapping
// ============================================================================

/**
 * Maps Anchor error codes from the SSS-Token program to SDK error classes.
 *
 * Error codes start at 6000 (Anchor convention).
 */
const ERROR_CODE_MAP: Record<number, (logs?: string[]) => SSSError> = {
    6000: () => new AuthorizationError("Not authorized — missing required role", 6000),
    6001: () => new TokenPausedError(),
    6002: () => new SSSError("Already paused", 6002),
    6003: () => new SSSError("Not paused", 6003),
    6004: () => new SSSError("Invalid amount — must be greater than zero", 6004),
    6005: () => new QuotaExceededError(0n, 0n, 0n),
    6006: () => new SSSError("Invalid role type", 6006),
    6007: () => new SSSError("Role not found", 6007),
    6008: () => new SSSError("Role not active", 6008),
    6009: () => new SSSError("Invalid mint address", 6009),
    6010: () => new SSSError("Name too long (max 32 characters)", 6010),
    6011: () => new SSSError("Symbol too long (max 10 characters)", 6011),
    6012: () => new SSSError("URI too long (max 200 characters)", 6012),
    6013: () => new SSSError("Reason too long (max 200 characters)", 6013),
    6014: () => new FeatureNotEnabledError("transfer_hook/permanent_delegate"),
    6015: () => new SSSError("Permanent delegate not enabled", 6015),
    6016: () => new SSSError("Invalid configuration", 6016),
    6017: () => new SSSError("Arithmetic overflow", 6017),
    6018: () => new SSSError("Arithmetic underflow", 6018),
    6019: () => new BlacklistedError("unknown"),
    6020: () => new SSSError("Account not blacklisted", 6020),
    6021: () => new SSSError("Blacklist entry required for this operation", 6021),
    6022: () => new SSSError("Blacklister role not found", 6022),
    6023: () => new AuthorizationError("Seize not authorized — requires Seizer role", 6023),
    6024: () => new SSSError("Account not frozen", 6024),
};

/**
 * Parses an Anchor program error into a typed SSSError.
 *
 * @param error - The raw error from Anchor/web3.js
 * @returns A typed SSSError instance
 */
export function parseError(error: unknown): SSSError {
    if (error instanceof SSSError) return error;

    // Extract Anchor error code
    const err = error as Record<string, unknown>;
    const code =
        typeof err?.code === "number"
            ? err.code
            : typeof (err?.error as Record<string, unknown>)?.code === "number"
                ? (err.error as Record<string, unknown>).code as number
                : undefined;

    if (code !== undefined && ERROR_CODE_MAP[code]) {
        const logs =
            err?.logs && Array.isArray(err.logs)
                ? (err.logs as string[])
                : undefined;
        return ERROR_CODE_MAP[code](logs);
    }

    // Fallback: wrap in generic SSSError
    const message =
        err?.message && typeof err.message === "string"
            ? err.message
            : "Unknown SSS error";

    return new SSSError(
        message,
        code,
        error instanceof Error ? error : undefined,
    );
}

// ============================================================================
// Spec-required named error aliases (HIGH-005)
// These aliases use the exact names required by the SSS specification,
// which differ from the internal implementation names above.
// We keep the originals to avoid breaking internal usage.
// ============================================================================

/**
 * @spec SssError — base error class alias required by the SSS spec.
 */
export class SssError extends SSSError {
    constructor(message: string, code?: number, cause?: Error) {
        super(message, code, cause);
        this.name = "SssError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * @spec SssInitError — initialization error class required by the SSS spec.
 * Maps to TransactionError for initialization transactions.
 */
export class SssInitError extends SSSError {
    constructor(message: string, cause?: Error) {
        super(message, undefined, cause);
        this.name = "SssInitError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * @spec SssMintError — minting error class required by the SSS spec.
 * Maps to QuotaExceededError and related mint errors.
 */
export class SssMintError extends SSSError {
    constructor(message: string, cause?: Error) {
        super(message, undefined, cause);
        this.name = "SssMintError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * @spec SssComplianceError — compliance error class required by the SSS spec.
 * Maps to BlacklistedError and related compliance errors.
 */
export class SssComplianceError extends SSSError {
    constructor(message: string, cause?: Error) {
        super(message, undefined, cause);
        this.name = "SssComplianceError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * @spec SssRpcError — network/RPC error class required by the SSS spec.
 * Maps to TransactionError for network-level failures.
 */
export class SssRpcError extends SSSError {
    constructor(message: string, cause?: Error) {
        super(message, undefined, cause);
        this.name = "SssRpcError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
