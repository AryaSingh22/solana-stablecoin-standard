//! Role record account and role type enum.
//!
//! Role records are PDAs that grant specific permissions to key holders.
//! They are never deleted — when a role is revoked, the `active` field is set to `false`
//! to maintain a complete audit trail.

use anchor_lang::prelude::*;

// Space = 8 (discriminator)
//       + 32 (mint Pubkey)
//       + 32 (holder Pubkey)
//       + 1 (role RoleType enum variant)
//       + 1 (active bool)
//       + 8 (granted_at i64)
//       + 1 (bump u8)
//       = 83
/// Size of the [`RoleRecord`] account in bytes, including the 8-byte discriminator.
pub const ROLE_RECORD_SIZE: usize = 8 + 32 + 32 + 1 + 1 + 8 + 1;

/// A record of a role granted to a specific key for a specific mint.
///
/// Derived as a PDA from `[SEED_ROLE, mint.key(), holder.key(), &[role as u8]]`.
/// Role records are never deleted. When revoked, `active` is set to `false`.
#[account]
#[derive(Debug)]
pub struct RoleRecord {
    /// The mint this role applies to.
    pub mint: Pubkey,
    /// The public key that holds this role.
    pub holder: Pubkey,
    /// The type of role granted.
    pub role: RoleType,
    /// Whether this role is currently active.
    pub active: bool,
    /// Unix timestamp when the role was granted.
    pub granted_at: i64,
    /// PDA bump seed for this account.
    pub bump: u8,
}

/// The type of role that can be assigned to a key holder.
///
/// Each role grants specific permissions within the SSS program:
/// - `MasterAuthority`: Full administrative control, can manage all other roles
/// - `Minter`: Can mint new tokens up to their quota
/// - `Burner`: Can burn tokens from their own account
/// - `Pauser`: Can pause/unpause all token operations
/// - `Blacklister`: Can add/remove addresses from the blacklist (SSS-2)
/// - `Seizer`: Can seize tokens from frozen, blacklisted accounts (SSS-2)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RoleType {
    /// Full administrative control over the stablecoin.
    MasterAuthority,
    /// Permission to mint new tokens (subject to quota).
    Minter,
    /// Permission to burn tokens.
    Burner,
    /// Permission to pause and unpause token operations.
    Pauser,
    /// Permission to manage the blacklist (SSS-2 only).
    Blacklister,
    /// Permission to seize tokens from blacklisted accounts (SSS-2 only).
    Seizer,
}
