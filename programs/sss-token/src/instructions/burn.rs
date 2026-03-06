//! Burn instruction — burns stablecoin tokens from the burner's account.
//!
//! Validates burner role, pause state, and updates supply tracking.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

/// Accounts required for the burn instruction.
#[derive(Accounts)]
pub struct BurnTokens<'info> {
    /// The burner — must have an active Burner role.
    #[account(mut)]
    pub burner: Signer<'info>,

    /// The stablecoin configuration PDA.
    #[account(
        mut,
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The pause state PDA — checked to ensure operations are not paused.
    #[account(
        seeds = [SEED_PAUSE, config.mint.as_ref()],
        bump = pause_state.bump,
    )]
    pub pause_state: Account<'info, PauseState>,

    /// The burner's role record PDA — must be an active Burner.
    #[account(
        seeds = [
            SEED_ROLE,
            config.mint.as_ref(),
            burner.key().as_ref(),
            &[RoleType::Burner as u8],
        ],
        bump = burner_role.bump,
        constraint = burner_role.active @ SssError::BurnerNotFound,
        constraint = burner_role.role == RoleType::Burner @ SssError::BurnerNotFound,
    )]
    pub burner_role: Account<'info, RoleRecord>,

    /// The Token-2022 mint account.
    #[account(
        mut,
        constraint = mint.key() == config.mint @ SssError::InvalidMint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The burner's token account to burn from.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = burner,
        associated_token::token_program = token_program,
    )]
    pub burner_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program.
    pub token_program: Interface<'info, TokenInterface>,
}

/// Event emitted when tokens are burned.
#[event]
pub struct TokensBurned {
    /// The mint address.
    pub mint: Pubkey,
    /// The number of tokens burned.
    pub amount: u64,
    /// The burner who executed the burn.
    pub burner: Pubkey,
    /// Unix timestamp of the burn.
    pub timestamp: i64,
}

/// Handler for the burn instruction.
///
/// Burns tokens from the burner's associated token account.
pub fn burn_handler(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    // Validate amount > 0
    require!(amount > 0, SssError::InvalidAmount);

    // Validate not paused
    require!(!ctx.accounts.pause_state.paused, SssError::TokensPaused);

    let clock = Clock::get()?;
    let mint_key = ctx.accounts.config.mint;

    // Burn tokens via CPI — burner is the owner of their token account
    anchor_spl::token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.burner_token_account.to_account_info(),
                authority: ctx.accounts.burner.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update total burned
    let config = &mut ctx.accounts.config;
    config.total_burned = config
        .total_burned
        .checked_add(amount)
        .ok_or(SssError::Overflow)?;

    // Emit event
    emit!(TokensBurned {
        mint: mint_key,
        amount,
        burner: ctx.accounts.burner.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
