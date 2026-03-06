//! Pause state account.
//!
//! Tracks whether token operations (mint, burn, transfer) are currently paused.
//! Compliance operations (freeze, thaw, seize) are NOT affected by pause state.

use anchor_lang::prelude::*;

// Space = 8 (discriminator)
//       + 32 (mint Pubkey)
//       + 1 (paused bool)
//       + 8 (paused_at i64)
//       + 32 (paused_by Pubkey)
//       + 1 (bump u8)
//       = 82
/// Size of the [`PauseState`] account in bytes, including the 8-byte discriminator.
pub const PAUSE_STATE_SIZE: usize = 8 + 32 + 1 + 8 + 32 + 1;

/// Tracks the pause state for a specific stablecoin mint.
///
/// Derived as a PDA from `[SEED_PAUSE, mint.key()]`.
/// When paused, mint, burn, and transfer operations are blocked.
/// Compliance operations (freeze, thaw, seize) still work while paused.
#[account]
#[derive(Debug)]
pub struct PauseState {
    /// The mint this pause state applies to.
    pub mint: Pubkey,
    /// Whether token operations are currently paused.
    pub paused: bool,
    /// Unix timestamp when the last pause/unpause occurred.
    pub paused_at: i64,
    /// The operator who last paused/unpaused.
    pub paused_by: Pubkey,
    /// PDA bump seed for this account.
    pub bump: u8,
}
