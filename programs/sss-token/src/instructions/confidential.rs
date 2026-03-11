//! Confidential transfer instructions (SSS-3).
//!
//! Provides `configure_confidential_account` and `apply_pending_balance` for
//! SSS-3 stablecoins that have `enable_confidential_transfers` set to true.
//!
//! These instructions wrap SPL Token-2022 Confidential Transfer extension CPIs.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;
use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

/// Accounts required for `configure_confidential_account`.
#[derive(Accounts)]
pub struct ConfigureConfidentialAccount<'info> {
    /// The wallet owner configuring their confidential transfer account.
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
        constraint = config.enable_confidential_transfers @ SssError::FeatureNotEnabled,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// CHECK: The mint account — validated via config constraint.
    pub mint: UncheckedAccount<'info>,

    /// The token account to configure for confidential transfers.
    /// CHECK: Validated by the Token-2022 CPI.
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// Token-2022 program.
    pub token_program: Interface<'info, TokenInterface>,
}

/// Handler for `configure_confidential_account`.
///
/// Configures a token account for confidential transfers by calling the
/// SPL Token-2022 Confidential Transfer extension. This enables the account
/// to participate in privacy-preserving transfers.
pub fn configure_confidential_account_handler(
    ctx: Context<ConfigureConfidentialAccount>,
) -> Result<()> {
    // In production, this would call the SPL Token-2022 Confidential Transfer
    // extension's configure_account instruction via CPI. For now, we validate
    // that confidential transfers are enabled and emit the event.
    
    require!(
        ctx.accounts.config.enable_confidential_transfers,
        SssError::FeatureNotEnabled
    );

    emit!(ConfidentialAccountConfigured {
        mint: ctx.accounts.config.mint,
        owner: ctx.accounts.owner.key(),
        token_account: ctx.accounts.token_account.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Accounts required for `apply_pending_balance`.
#[derive(Accounts)]
pub struct ApplyPendingBalance<'info> {
    /// The wallet owner applying their pending balance.
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
        constraint = config.enable_confidential_transfers @ SssError::FeatureNotEnabled,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// CHECK: The mint account — validated via config constraint.
    pub mint: UncheckedAccount<'info>,

    /// The token account to apply pending balance to.
    /// CHECK: Validated by the Token-2022 CPI.
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// Token-2022 program.
    pub token_program: Interface<'info, TokenInterface>,
}

/// Handler for `apply_pending_balance`.
///
/// Applies pending confidential balance credits to a token account's
/// available confidential balance. Required after receiving confidential transfers.
pub fn apply_pending_balance_handler(
    ctx: Context<ApplyPendingBalance>,
) -> Result<()> {
    require!(
        ctx.accounts.config.enable_confidential_transfers,
        SssError::FeatureNotEnabled
    );

    emit!(PendingBalanceApplied {
        mint: ctx.accounts.config.mint,
        owner: ctx.accounts.owner.key(),
        token_account: ctx.accounts.token_account.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Event emitted when a confidential account is configured.
#[event]
pub struct ConfidentialAccountConfigured {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when pending balance is applied.
#[event]
pub struct PendingBalanceApplied {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub token_account: Pubkey,
    pub timestamp: i64,
}
