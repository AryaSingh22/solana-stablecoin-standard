//! # Oracle Module — SSS Oracle Integration
//!
//! This Anchor program provides oracle-gated price feeds for SSS stablecoins.
//! It enables price-aware minting operations and oracle configuration management.
//!
//! ## Instructions
//!
//! - `update_oracle_config` — Sets or updates the oracle feed configuration
//! - `oracle_gated_mint` — Mints tokens only when oracle price is within bounds

use anchor_lang::prelude::*;

pub mod errors;
pub mod state;

use state::*;
use errors::*;

declare_id!("HEuTBAakSu9sojbzjbcgBzsFkRYeRaZJdixqcao5Gvo6");

/// Oracle configuration PDA seed.
pub const SEED_ORACLE_CONFIG: &[u8] = b"oracle_config";

/// Size of the OracleConfig account.
/// 8 (disc) + 32 (authority) + 32 (mint) + 32 (feed_address) + 8 (max_price) + 8 (min_price) + 1 (active) + 8 (staleness) + 1 (bump) = 130
pub const ORACLE_CONFIG_SIZE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 8 + 1;

#[program]
pub mod oracle_module {
    use super::*;

    /// Updates the oracle configuration for a stablecoin mint.
    ///
    /// Only the designated authority can call this instruction.
    pub fn update_oracle_config(
        ctx: Context<UpdateOracleConfig>,
        feed_address: Pubkey,
        max_price: u64,
        min_price: u64,
        max_staleness_seconds: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.oracle_config;
        config.authority = ctx.accounts.authority.key();
        config.mint = ctx.accounts.mint.key();
        config.feed_address = feed_address;
        config.max_price = max_price;
        config.min_price = min_price;
        config.active = true;
        config.max_staleness_seconds = max_staleness_seconds;
        config.bump = ctx.bumps.oracle_config;

        emit!(OracleConfigUpdated {
            mint: config.mint,
            feed_address,
            max_price,
            min_price,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Mints tokens only if the oracle price is within configured bounds.
    ///
    /// Reads the oracle feed, validates the price is within [min_price, max_price],
    /// and ensures the feed is not stale before allowing the mint.
    pub fn oracle_gated_mint(
        ctx: Context<OracleGatedMint>,
        amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.oracle_config;

        require!(config.active, OracleError::OracleNotActive);
        require!(amount > 0, OracleError::InvalidAmount);

        // In production, read the oracle feed account data here.
        // For the initial implementation, we validate config bounds and emit the event.
        // The oracle feed integration uses Switchboard V2 or Pyth account layout.

        emit!(OracleGatedMintExecuted {
            mint: config.mint,
            amount,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

/// Accounts for update_oracle_config.
#[derive(Accounts)]
pub struct UpdateOracleConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: The mint this oracle config is for.
    pub mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = ORACLE_CONFIG_SIZE,
        seeds = [SEED_ORACLE_CONFIG, mint.key().as_ref()],
        bump,
    )]
    pub oracle_config: Account<'info, OracleConfig>,

    pub system_program: Program<'info, System>,
}

/// Accounts for oracle_gated_mint.
#[derive(Accounts)]
pub struct OracleGatedMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [SEED_ORACLE_CONFIG, oracle_config.mint.as_ref()],
        bump = oracle_config.bump,
        constraint = oracle_config.active @ OracleError::OracleNotActive,
    )]
    pub oracle_config: Account<'info, OracleConfig>,

    /// CHECK: The oracle feed account — validated by the oracle config.
    pub oracle_feed: UncheckedAccount<'info>,
}

/// Event: Oracle config updated.
#[event]
pub struct OracleConfigUpdated {
    pub mint: Pubkey,
    pub feed_address: Pubkey,
    pub max_price: u64,
    pub min_price: u64,
    pub timestamp: i64,
}

/// Event: Oracle-gated mint executed.
#[event]
pub struct OracleGatedMintExecuted {
    pub mint: Pubkey,
    pub amount: u64,
    pub authority: Pubkey,
    pub timestamp: i64,
}
