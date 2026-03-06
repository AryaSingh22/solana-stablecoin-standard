/**
 * @module utils
 * @description CLI utility functions.
 *
 * HIGH-004: simulateTransaction helper for --dry-run support on write commands.
 */

import { Connection, Transaction, Keypair } from "@solana/web3.js";

/**
 * Simulates a transaction against the RPC without submitting it.
 * Used to implement --dry-run on mint, burn, freeze, thaw commands.
 *
 * @param connection - Active Solana connection
 * @param transaction - The transaction to simulate
 * @param signers - The keypairs that would sign the transaction
 */
export async function simulateTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Keypair[],
): Promise<void> {
    // Fetch the latest blockhash to satisfy the simulation requirement
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = signers[0].publicKey;

    // Sign for simulation (required by some RPC endpoints)
    transaction.sign(...signers);

    const simulation = await connection.simulateTransaction(transaction);

    console.log("──────────────────────────────────────────");
    console.log("DRY RUN RESULT (transaction NOT submitted)");
    console.log("──────────────────────────────────────────");

    if (simulation.value.err) {
        console.log("Status:       ❌ WOULD FAIL");
        console.log("Error:        ", JSON.stringify(simulation.value.err));
    } else {
        console.log("Status:       ✅ WOULD SUCCEED");
        console.log("Units:        ", simulation.value.unitsConsumed ?? "unknown");
    }

    if (simulation.value.logs && simulation.value.logs.length > 0) {
        console.log("Program logs:");
        simulation.value.logs.forEach(log => console.log(" ", log));
    }

    console.log("──────────────────────────────────────────");
    console.log("(No transaction submitted — dry run only)");
}
