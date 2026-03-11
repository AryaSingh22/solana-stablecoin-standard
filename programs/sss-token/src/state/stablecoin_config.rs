//! Stablecoin configuration account.
//!
//! This is the primary PDA for each stablecoin deployed via SSS.
//! It stores the mint address, authority, extension flags, and aggregate supply data.

use anchor_lang::prelude::*;
use crate::constants::*;

// Space = 8 (discriminator)
//       + 32 (authority Pubkey)
//       + 32 (mint Pubkey)
//       + 4 + 32 (name String: len prefix + max bytes)
//       + 4 + 10 (symbol String: len prefix + max bytes)
//       + 4 + 200 (uri String: len prefix + max bytes)
//       + 1 (decimals u8)
//       + 1 (enable_permanent_delegate bool)
//       + 1 (enable_transfer_hook bool)
//       + 1 (default_account_frozen bool)
//       + 1 (enable_confidential_transfers bool) -- SSS-3
//       + 1 (enable_allowlist bool) -- SSS-3
//       + 1 (paused bool)
//       + 8 (total_minted u64)
//       + 8 (total_burned u64)
//       + 1 (bump u8)
//       = 350
/// Size of the [`StablecoinConfig`] account in bytes, including the 8-byte discriminator.
pub const STABLECOIN_CONFIG_SIZE: usize = 8 + 32 + 32 + (4 + MAX_NAME_LEN) + (4 + MAX_SYMBOL_LEN) + (4 + MAX_URI_LEN) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 8 + 8 + 1;

/// Primary configuration account for a stablecoin deployed via the SSS program.
///
/// Derived as a PDA from `[SEED_CONFIG, mint.key()]`.
/// The `enable_permanent_delegate`, `enable_transfer_hook`, and `default_account_frozen`
/// flags are set once at initialization and are **immutable forever**. Any instruction
/// that attempts to modify them after init will fail with `ConfigImmutable`.
#[account]
#[derive(Debug)]
pub struct StablecoinConfig {
    /// The master authority who can manage roles and transfer authority.
    pub authority: Pubkey,
    /// The Token-2022 mint address this config governs.
    pub mint: Pubkey,
    /// Human-readable name for the stablecoin (max 32 bytes).
    pub name: String,
    /// Ticker symbol for the stablecoin (max 10 bytes).
    pub symbol: String,
    /// Metadata URI for off-chain metadata (max 200 bytes).
    pub uri: String,
    /// Number of decimal places for the token.
    pub decimals: u8,
    /// Whether the permanent delegate extension is enabled (immutable after init).
    pub enable_permanent_delegate: bool,
    /// Whether the transfer hook extension is enabled (immutable after init).
    pub enable_transfer_hook: bool,
    /// Whether new token accounts are frozen by default (immutable after init).
    pub default_account_frozen: bool,
    /// Whether confidential transfers (SPL Token-2022 extension) are enabled (SSS-3, immutable after init).
    pub enable_confidential_transfers: bool,
    /// Whether allowlist-based access control is enabled (SSS-3, immutable after init).
    pub enable_allowlist: bool,
    /// Whether token operations (mint, burn, transfer) are currently paused.
    pub paused: bool,
    /// Cumulative total of tokens minted since initialization.
    pub total_minted: u64,
    /// Cumulative total of tokens burned since initialization.
    pub total_burned: u64,
    /// PDA bump seed for this account.
    pub bump: u8,
}
