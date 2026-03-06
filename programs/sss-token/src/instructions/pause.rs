//! Pause and unpause instructions — halts or resumes token operations.
//!
//! When paused, mint, burn, and transfer operations are blocked.
//! Compliance operations (freeze, thaw, seize) still work while paused.

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

/// Accounts required for the pause and unpause instructions.
#[derive(Accounts)]
pub struct PauseOrUnpause<'info> {
    /// The operator — must have Pauser or MasterAuthority role.
    #[account(mut)]
    pub operator: Signer<'info>,

    /// The stablecoin configuration PDA.
    #[account(
        mut,
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The pause state PDA to be updated.
    #[account(
        mut,
        seeds = [SEED_PAUSE, config.mint.as_ref()],
        bump = pause_state.bump,
    )]
    pub pause_state: Account<'info, PauseState>,

    /// The operator's role record PDA.
    /// Must be either Pauser or MasterAuthority with active status.
    pub operator_role: Account<'info, RoleRecord>,
}

/// Event emitted when token operations are paused.
#[event]
pub struct TokensPausedEvent {
    /// The mint address.
    pub mint: Pubkey,
    /// The operator who paused operations.
    pub operator: Pubkey,
    /// Unix timestamp when paused.
    pub timestamp: i64,
}

/// Event emitted when token operations are unpaused.
#[event]
pub struct TokensUnpausedEvent {
    /// The mint address.
    pub mint: Pubkey,
    /// The operator who unpaused operations.
    pub operator: Pubkey,
    /// Unix timestamp when unpaused.
    pub timestamp: i64,
}

/// Validates that the operator has Pauser or MasterAuthority role.
fn validate_pauser(
    operator_role: &Account<RoleRecord>,
    operator_key: &Pubkey,
    mint_key: &Pubkey,
) -> Result<()> {
    require!(
        operator_role.holder == *operator_key,
        SssError::NotAuthorized
    );
    require!(
        operator_role.mint == *mint_key,
        SssError::InvalidMint
    );
    require!(operator_role.active, SssError::PauserNotFound);
    require!(
        operator_role.role == RoleType::Pauser
            || operator_role.role == RoleType::MasterAuthority,
        SssError::PauserNotFound
    );
    Ok(())
}

/// Handler for the pause instruction.
///
/// Pauses all token operations (mint, burn, transfer).
/// Does NOT prevent freeze/thaw/seize — compliance operations must still work.
pub fn handler_pause(ctx: Context<PauseOrUnpause>) -> Result<()> {
    validate_pauser(
        &ctx.accounts.operator_role,
        &ctx.accounts.operator.key(),
        &ctx.accounts.config.mint,
    )?;

    // MED-001: Guard against double-pause
    require!(!ctx.accounts.pause_state.paused, SssError::AlreadyPaused);

    let clock = Clock::get()?;

    // Update pause state
    let pause_state = &mut ctx.accounts.pause_state;
    pause_state.paused = true;
    pause_state.paused_at = clock.unix_timestamp;
    pause_state.paused_by = ctx.accounts.operator.key();

    // Also update config for quick reads
    let config = &mut ctx.accounts.config;
    config.paused = true;

    emit!(TokensPausedEvent {
        mint: ctx.accounts.config.mint,
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Handler for the unpause instruction.
///
/// Resumes all token operations (mint, burn, transfer).
pub fn handler_unpause(ctx: Context<PauseOrUnpause>) -> Result<()> {
    validate_pauser(
        &ctx.accounts.operator_role,
        &ctx.accounts.operator.key(),
        &ctx.accounts.config.mint,
    )?;

    // MED-001: Guard against double-unpause (not-yet-paused)
    require!(ctx.accounts.pause_state.paused, SssError::NotPaused);

    let clock = Clock::get()?;

    // Update pause state
    let pause_state = &mut ctx.accounts.pause_state;
    pause_state.paused = false;
    pause_state.paused_at = clock.unix_timestamp;
    pause_state.paused_by = ctx.accounts.operator.key();

    // Also update config for quick reads
    let config = &mut ctx.accounts.config;
    config.paused = false;

    emit!(TokensUnpausedEvent {
        mint: ctx.accounts.config.mint,
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
