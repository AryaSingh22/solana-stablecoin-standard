//! Compliance instructions — add_to_blacklist, remove_from_blacklist (SSS-2 only).
//!
//! These instructions are feature-gated: they require `enable_transfer_hook` to be true.
//! The feature gate check is the FIRST line of every handler body.

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

// ============================================================================
// Add to Blacklist
// ============================================================================

/// Accounts required for the add_to_blacklist instruction.
#[derive(Accounts)]
#[instruction(reason: String)]
pub struct AddToBlacklist<'info> {
    /// The blacklister operator — must have Blacklister role.
    #[account(mut)]
    pub operator: Signer<'info>,

    /// The stablecoin configuration PDA.
    #[account(
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The operator's Blacklister role record.
    #[account(
        seeds = [
            SEED_ROLE,
            config.mint.as_ref(),
            operator.key().as_ref(),
            &[RoleType::Blacklister as u8],
        ],
        bump = operator_role.bump,
        constraint = operator_role.active @ SssError::BlacklisterNotFound,
        constraint = operator_role.role == RoleType::Blacklister @ SssError::BlacklisterNotFound,
    )]
    pub operator_role: Account<'info, RoleRecord>,

    /// The blacklist entry PDA to be created.
    #[account(
        init,
        payer = operator,
        space = BLACKLIST_ENTRY_SIZE,
        seeds = [SEED_BLACKLIST, config.mint.as_ref(), target.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    /// The target wallet being blacklisted.
    /// CHECK: This is the wallet address to blacklist. We only store the key.
    pub target: UncheckedAccount<'info>,

    /// The Token-2022 mint account.
    #[account(
        constraint = mint.key() == config.mint @ SssError::InvalidMint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The target's token account to be frozen.
    #[account(
        mut,
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub target_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program for freeze CPI.
    pub token_program: Interface<'info, TokenInterface>,

    /// System program for account creation.
    pub system_program: Program<'info, System>,
}

/// Event emitted when an address is added to the blacklist.
#[event]
pub struct AddedToBlacklist {
    /// The mint address.
    pub mint: Pubkey,
    /// The blacklisted wallet address.
    pub target: Pubkey,
    /// The reason for blacklisting.
    pub reason: String,
    /// The operator who performed the blacklisting.
    pub operator: Pubkey,
    /// Unix timestamp.
    pub timestamp: i64,
}

/// Handler for the add_to_blacklist instruction (SSS-2 only).
///
/// Feature-gated: requires `enable_transfer_hook` to be true.
/// Creates a BlacklistEntry PDA and freezes the target's token account.
pub fn handler_add_to_blacklist(ctx: Context<AddToBlacklist>, reason: String) -> Result<()> {
    // SSS-2 feature gate — FIRST LINE of handler body
    require!(
        ctx.accounts.config.enable_transfer_hook,
        SssError::FeatureNotEnabled
    );

    // Validate reason length
    require!(reason.len() <= MAX_REASON_LEN, SssError::ReasonTooLong);

    let clock = Clock::get()?;
    let mint_key = ctx.accounts.config.mint;

    // Initialize blacklist entry
    let entry = &mut ctx.accounts.blacklist_entry;
    entry.mint = mint_key;
    entry.target = ctx.accounts.target.key();
    entry.reason = reason.clone();
    entry.added_at = clock.unix_timestamp;
    entry.added_by = ctx.accounts.operator.key();
    entry.active = true;
    entry.bump = ctx.bumps.blacklist_entry;

    // Freeze the target's token account via CPI
    // MED-002: Check if already frozen before calling freeze CPI.
    // If the account is already frozen (e.g., from a prior manual freeze),
    // skip the CPI to avoid a redundant-freeze error.
    let config_bump = ctx.accounts.config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[SEED_CONFIG, mint_key.as_ref(), &[config_bump]]];

    if !ctx.accounts.target_token_account.is_frozen() {
        anchor_spl::token_2022::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_2022::FreezeAccount {
                    account: ctx.accounts.target_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
        )?;
    }

    emit!(AddedToBlacklist {
        mint: mint_key,
        target: ctx.accounts.target.key(),
        reason,
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================================================
// Remove from Blacklist
// ============================================================================

/// Accounts required for the remove_from_blacklist instruction.
#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    /// The blacklister operator — must have Blacklister role.
    #[account(mut)]
    pub operator: Signer<'info>,

    /// The stablecoin configuration PDA.
    #[account(
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The operator's Blacklister role record.
    #[account(
        seeds = [
            SEED_ROLE,
            config.mint.as_ref(),
            operator.key().as_ref(),
            &[RoleType::Blacklister as u8],
        ],
        bump = operator_role.bump,
        constraint = operator_role.active @ SssError::BlacklisterNotFound,
        constraint = operator_role.role == RoleType::Blacklister @ SssError::BlacklisterNotFound,
    )]
    pub operator_role: Account<'info, RoleRecord>,

    /// The blacklist entry PDA to be deactivated.
    #[account(
        mut,
        seeds = [SEED_BLACKLIST, config.mint.as_ref(), target.key().as_ref()],
        bump = blacklist_entry.bump,
        constraint = blacklist_entry.active @ SssError::AccountNotBlacklisted,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    /// The target wallet being removed from blacklist.
    /// CHECK: This is the wallet address. We only read the key.
    pub target: UncheckedAccount<'info>,
}

/// Event emitted when an address is removed from the blacklist.
#[event]
pub struct RemovedFromBlacklist {
    /// The mint address.
    pub mint: Pubkey,
    /// The wallet address removed from blacklist.
    pub target: Pubkey,
    /// The operator who removed the entry.
    pub operator: Pubkey,
    /// Unix timestamp.
    pub timestamp: i64,
}

/// Handler for the remove_from_blacklist instruction (SSS-2 only).
///
/// Feature-gated: requires `enable_transfer_hook` to be true.
/// Deactivates the BlacklistEntry PDA. Does NOT automatically thaw the
/// target's token account — the operator must call thaw_account separately.
pub fn handler_remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
    // SSS-2 feature gate — FIRST LINE of handler body
    require!(
        ctx.accounts.config.enable_transfer_hook,
        SssError::FeatureNotEnabled
    );

    let clock = Clock::get()?;

    // Deactivate blacklist entry (never delete — audit trail)
    let entry = &mut ctx.accounts.blacklist_entry;
    entry.active = false;

    emit!(RemovedFromBlacklist {
        mint: ctx.accounts.config.mint,
        target: ctx.accounts.target.key(),
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
