/**
 * @module sss-token CLI
 * @description Command-line interface for the Solana Stablecoin Standard.
 *
 * Usage:
 *   sss-token init --name "USD Stablecoin" --symbol USDS --uri https://...
 *   sss-token mint --mint <pubkey> --recipient <pubkey> --amount 1000000
 *   sss-token burn --mint <pubkey> --amount 500000
 *   sss-token freeze --mint <pubkey> --target <token-account>
 *   sss-token pause --mint <pubkey>
 *   sss-token roles grant --mint <pubkey> --holder <pubkey> --role minter
 *   sss-token status --mint <pubkey>
 */

import { Command } from "commander";
import { registerCommands } from "./commands";

const program = new Command();

program
    .name("sss-token")
    .description("Solana Stablecoin Standard (SSS) CLI")
    .version("0.1.0")
    .option("--rpc-url <url>", "Solana RPC endpoint URL")
    .option("--commitment <level>", "Commitment level", "confirmed")
    .option("--keypair <path>", "Path to keypair file")
    .option("--json", "Output in JSON format")
    .option("--verbose", "Enable verbose logging");

registerCommands(program);

program.parseAsync(process.argv).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
});
