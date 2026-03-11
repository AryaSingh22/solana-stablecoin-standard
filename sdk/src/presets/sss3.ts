/**
 * @module presets/sss3
 * @description SSS-3 preset configuration — private stablecoin.
 *
 * SSS-3 extends SSS-2 with: confidential transfers (via SPL Token-2022
 * Confidential Transfer extension), and allowlist-based access control.
 * Only allowlisted wallets can transact with the token.
 */

import { PublicKey } from "@solana/web3.js";
import type { InitializeArgs } from "../types";

/**
 * Default initialization arguments for an SSS-3 stablecoin.
 *
 * @param name - Stablecoin name
 * @param symbol - Ticker symbol
 * @param uri - Metadata URI
 * @param hookProgramId - The transfer hook program ID
 * @param decimals - Decimal places (default: 6)
 * @returns InitializeArgs configured for SSS-3
 */
export function sss3Preset(
    name: string,
    symbol: string,
    uri: string,
    hookProgramId: PublicKey,
    decimals = 6,
): InitializeArgs {
    return {
        name,
        symbol,
        uri,
        decimals,
        enablePermanentDelegate: true,
        enableTransferHook: true,
        defaultAccountFrozen: true,
        hookProgramId,
        enableConfidentialTransfers: true,
        enableAllowlist: true,
    };
}

/**
 * SSS-3 feature flags for documentation and validation.
 */
export const SSS3_FEATURES = {
    mint: true,
    burn: true,
    freeze: true,
    pause: true,
    roles: true,
    blacklist: true,
    seize: true,
    transferHook: true,
    permanentDelegate: true,
    confidentialTransfers: true,
    allowlist: true,
} as const;
