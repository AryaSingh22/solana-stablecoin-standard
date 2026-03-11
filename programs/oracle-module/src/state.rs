//! Oracle module state accounts.

use anchor_lang::prelude::*;

/// Oracle configuration for a stablecoin mint.
///
/// Derived as PDA from `["oracle_config", mint]`.
#[account]
#[derive(Debug)]
pub struct OracleConfig {
    /// Authority who can update this config.
    pub authority: Pubkey,
    /// The stablecoin mint this oracle config applies to.
    pub mint: Pubkey,
    /// The oracle feed account address (Switchboard or Pyth).
    pub feed_address: Pubkey,
    /// Maximum allowed price for minting (scaled by feed decimals).
    pub max_price: u64,
    /// Minimum allowed price for minting (scaled by feed decimals).
    pub min_price: u64,
    /// Whether this oracle config is active.
    pub active: bool,
    /// Maximum staleness in seconds before the feed is considered stale.
    pub max_staleness_seconds: i64,
    /// PDA bump seed.
    pub bump: u8,
}
