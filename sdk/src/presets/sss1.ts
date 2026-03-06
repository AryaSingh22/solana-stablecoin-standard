/**
 * @module presets/sss1
 * @description SSS-1 preset configuration — basic stablecoin.
 *
 * SSS-1 provides: mint, burn, freeze/thaw, pause/unpause, role management.
 * No compliance features (blacklist, seize, transfer hook).
 */

import type { InitializeArgs } from "../types";

/**
 * Default initialization arguments for an SSS-1 stablecoin.
 *
 * @param name - Stablecoin name
 * @param symbol - Ticker symbol
 * @param uri - Metadata URI
 * @param decimals - Decimal places (default: 6)
 * @returns InitializeArgs configured for SSS-1
 */
export function sss1Preset(
    name: string,
    symbol: string,
    uri: string,
    decimals = 6,
): InitializeArgs {
    return {
        name,
        symbol,
        uri,
        decimals,
        enablePermanentDelegate: false,
        enableTransferHook: false,
        defaultAccountFrozen: false,
        hookProgramId: undefined,
    };
}

/**
 * SSS-1 feature flags for documentation and validation.
 */
export const SSS1_FEATURES = {
    mint: true,
    burn: true,
    freeze: true,
    pause: true,
    roles: true,
    blacklist: false,
    seize: false,
    transferHook: false,
    permanentDelegate: false,
} as const;
