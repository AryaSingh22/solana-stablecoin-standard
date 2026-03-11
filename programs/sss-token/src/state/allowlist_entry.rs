//! Allowlist entry account (SSS-3).
//!
//! Tracks which wallets are on the allowlist for an SSS-3 stablecoin.
//! Only allowlisted wallets may transact with the token when allowlist is enabled.

use anchor_lang::prelude::*;

/// Size of the [`AllowlistEntry`] account in bytes, including the 8-byte discriminator.
/// 8 (discriminator) + 32 (mint) + 32 (wallet) + 8 (added_at) + 1 (active) + 1 (bump) = 82
pub const ALLOWLIST_ENTRY_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 1;

/// An entry on the allowlist for an SSS-3 stablecoin.
///
/// Derived as a PDA from `[SEED_ALLOWLIST, mint.key(), wallet.key()]`.
#[account]
#[derive(Debug)]
pub struct AllowlistEntry {
    /// The Token-2022 mint this allowlist entry belongs to.
    pub mint: Pubkey,
    /// The wallet address that is allowlisted.
    pub wallet: Pubkey,
    /// Unix timestamp when the wallet was added to the allowlist.
    pub added_at: i64,
    /// Whether this entry is currently active.
    pub active: bool,
    /// PDA bump seed for this account.
    pub bump: u8,
}
