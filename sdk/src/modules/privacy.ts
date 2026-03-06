/**
 * @module modules/privacy
 * @description Privacy module placeholder for SSS-3 (confidential transfers).
 *
 * SSS-3 will leverage SPL Confidential Transfer extension
 * for zero-knowledge proof-based privacy-preserving transfers.
 *
 * This module is a placeholder for future implementation.
 */

import { PublicKey } from "@solana/web3.js";
import { FeatureNotEnabledError } from "../errors";

/**
 * PrivacyModule — SSS-3 confidential transfer operations (placeholder).
 *
 * @remarks
 * This module will be implemented when SPL Confidential Transfer
 * extension support is mature and audited.
 */
export class PrivacyModule {
    private readonly mint: PublicKey;

    constructor(mint: PublicKey) {
        this.mint = mint;
    }

    /**
     * Initializes confidential transfer extension for the mint.
     * @throws FeatureNotEnabledError — SSS-3 is not yet implemented
     */
    async initializeConfidentialTransfer(): Promise<never> {
        throw new FeatureNotEnabledError(
            "SSS-3 confidential transfers are not yet implemented",
        );
    }

    /**
     * Creates a confidential transfer.
     * @throws FeatureNotEnabledError — SSS-3 is not yet implemented
     */
    async confidentialTransfer(): Promise<never> {
        throw new FeatureNotEnabledError(
            "SSS-3 confidential transfers are not yet implemented",
        );
    }

    /**
     * Retrieves the confidential balance of a token account.
     * @throws FeatureNotEnabledError — SSS-3 is not yet implemented
     */
    async getConfidentialBalance(): Promise<never> {
        throw new FeatureNotEnabledError(
            "SSS-3 confidential transfers are not yet implemented",
        );
    }
}
