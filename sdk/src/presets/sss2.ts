/**
 * @module presets/sss2
 * @description SSS-2 preset configuration — enhanced compliance stablecoin.
 *
 * SSS-2 extends SSS-1 with: blacklist, seize (permanent delegate),
 * transfer hook for real-time compliance, and default-frozen accounts.
 */

import { PublicKey } from "@solana/web3.js";
import type { InitializeArgs } from "../types";

/**
 * Default initialization arguments for an SSS-2 stablecoin.
 *
 * @param name - Stablecoin name
 * @param symbol - Ticker symbol
 * @param uri - Metadata URI
 * @param hookProgramId - The transfer hook program ID
 * @param decimals - Decimal places (default: 6)
 * @returns InitializeArgs configured for SSS-2
 */
export function sss2Preset(
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
    };
}

/**
 * SSS-2 feature flags for documentation and validation.
 */
export const SSS2_FEATURES = {
    mint: true,
    burn: true,
    freeze: true,
    pause: true,
    roles: true,
    blacklist: true,
    seize: true,
    transferHook: true,
    permanentDelegate: true,
} as const;
