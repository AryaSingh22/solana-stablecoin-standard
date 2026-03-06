/**
 * @module shared/solana
 * @description Solana transaction utilities with retry logic.
 */

import {
    Connection,
    Transaction,
    Keypair,
    sendAndConfirmTransaction,
} from "@solana/web3.js";

/**
 * Sends a transaction with exponential-backoff retry.
 *
 * @param connection  - Solana RPC connection
 * @param tx          - Transaction to send
 * @param signers     - Transaction signers
 * @param maxAttempts - Maximum number of retry attempts (default 3)
 * @returns The confirmed transaction signature
 */
export async function sendWithRetry(
    connection: Connection,
    tx: Transaction,
    signers: Keypair[],
    maxAttempts = 3,
): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const sig = await sendAndConfirmTransaction(connection, tx, signers, {
                commitment: "confirmed",
            });
            return sig;
        } catch (err) {
            if (attempt === maxAttempts) throw err;
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await sleep(delayMs);
        }
    }
    throw new Error("unreachable");
}

/**
 * Loads a Keypair from an environment variable.
 * Supports JSON array format (e.g. from solana-keygen) and base64.
 */
export function loadKeypairFromEnv(envVar: string): Keypair {
    const raw = process.env[envVar];
    if (!raw) {
        throw new Error(`Environment variable ${envVar} is not set`);
    }

    // Try JSON array format first (e.g. from solana-keygen output)
    try {
        const bytes = JSON.parse(raw);
        if (Array.isArray(bytes)) {
            return Keypair.fromSecretKey(Uint8Array.from(bytes));
        }
    } catch {
        // Not JSON — try base64
    }

    // Try base64 format
    try {
        const decoded = Buffer.from(raw, "base64");
        if (decoded.length === 64) {
            return Keypair.fromSecretKey(decoded);
        }
    } catch {
        // fall through
    }

    throw new Error(
        `Could not parse ${envVar} as a keypair. Provide a JSON array [n,...] or base64 secret key.`,
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
