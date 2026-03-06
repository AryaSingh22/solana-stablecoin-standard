//! Minter quota account.
//!
//! Controls how many tokens a minter can mint within a given period.
//! A limit of 0 means unlimited minting is allowed.

use anchor_lang::prelude::*;

// Space = 8 (discriminator)
//       + 32 (mint Pubkey)
//       + 32 (minter Pubkey)
//       + 8 (limit u64)
//       + 8 (used u64)
//       + 1 (period QuotaPeriod enum variant)
//       + 1 (bump u8)
//       = 90
/// Size of the [`MinterQuota`] account in bytes, including the 8-byte discriminator.
pub const MINTER_QUOTA_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;

/// Tracks the minting allowance for a specific minter on a specific mint.
///
/// Derived as a PDA from `[SEED_QUOTA, mint.key(), minter.key()]`.
/// The `used` counter is checked against `limit` before each mint operation.
/// A `limit` of 0 indicates unlimited minting.
#[account]
#[derive(Debug)]
pub struct MinterQuota {
    /// The mint this quota applies to.
    pub mint: Pubkey,
    /// The minter's public key.
    pub minter: Pubkey,
    /// Maximum number of tokens allowed to be minted in the period. 0 = unlimited.
    pub limit: u64,
    /// Number of tokens already minted in the current period.
    pub used: u64,
    /// The time period over which the quota resets.
    pub period: QuotaPeriod,
    /// PDA bump seed for this account.
    pub bump: u8,
}

/// The time period over which a minter's quota resets.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum QuotaPeriod {
    /// Quota resets every 24 hours.
    Daily,
    /// Quota resets every 7 days.
    Weekly,
    /// Quota resets every 30 days.
    Monthly,
    /// Quota never resets — lifetime cumulative limit.
    Lifetime,
}
