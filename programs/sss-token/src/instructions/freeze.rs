//! Freeze and thaw instructions — freezes or thaws a target token account.
//!
//! Only MasterAuthority or Blacklister roles can freeze/thaw accounts.
//! Uses the freeze authority PDA (which is the StablecoinConfig PDA).

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

/// Accounts required for freeze_account and thaw_account instructions.
#[derive(Accounts)]
pub struct FreezeOrThaw<'info> {
    /// The operator — must have MasterAuthority or Blacklister role.
    #[account(mut)]
    pub operator: Signer<'info>,

    /// The stablecoin configuration PDA (also the freeze authority).
    #[account(
        seeds = [SEED_CONFIG, config.mint.as_ref()],
        bump = config.bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The operator's role record PDA.
    /// Must be either MasterAuthority or Blacklister with active status.
    /// CHECK: We manually verify role type and active status in the handler.
    pub operator_role: Account<'info, RoleRecord>,

    /// The Token-2022 mint account.
    #[account(
        constraint = mint.key() == config.mint @ SssError::InvalidMint,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The target token account to freeze or thaw.
    #[account(
        mut,
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub target_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program.
    pub token_program: Interface<'info, TokenInterface>,
}

/// Event emitted when a token account is frozen.
#[event]
pub struct AccountFrozen {
    /// The mint address.
    pub mint: Pubkey,
    /// The frozen token account address.
    pub target: Pubkey,
    /// The operator who froze the account.
    pub operator: Pubkey,
    /// Unix timestamp.
    pub timestamp: i64,
}

/// Event emitted when a token account is thawed.
#[event]
pub struct AccountThawed {
    /// The mint address.
    pub mint: Pubkey,
    /// The thawed token account address.
    pub target: Pubkey,
    /// The operator who thawed the account.
    pub operator: Pubkey,
    /// Unix timestamp.
    pub timestamp: i64,
}

/// Validates that the operator has MasterAuthority or Blacklister role.
fn validate_freeze_authority(
    operator_role: &Account<RoleRecord>,
    operator_key: &Pubkey,
    mint_key: &Pubkey,
) -> Result<()> {
    // Verify the role record belongs to the operator and the correct mint
    require!(
        operator_role.holder == *operator_key,
        SssError::NotAuthorized
    );
    require!(
        operator_role.mint == *mint_key,
        SssError::InvalidMint
    );
    require!(operator_role.active, SssError::NotAuthorized);
    require!(
        operator_role.role == RoleType::MasterAuthority
            || operator_role.role == RoleType::Blacklister,
        SssError::NotAuthorized
    );
    Ok(())
}

/// Handler for the freeze_account instruction.
///
/// Freezes a target token account using the config PDA as freeze authority.
pub fn handler_freeze(ctx: Context<FreezeOrThaw>) -> Result<()> {
    validate_freeze_authority(
        &ctx.accounts.operator_role,
        &ctx.accounts.operator.key(),
        &ctx.accounts.config.mint,
    )?;

    let clock = Clock::get()?;
    let mint_key = ctx.accounts.config.mint;
    let config_bump = ctx.accounts.config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[SEED_CONFIG, mint_key.as_ref(), &[config_bump]]];

    // Freeze the token account via CPI
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

    emit!(AccountFrozen {
        mint: mint_key,
        target: ctx.accounts.target_token_account.key(),
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Handler for the thaw_account instruction.
///
/// Thaws a frozen token account using the config PDA as freeze authority.
pub fn handler_thaw(ctx: Context<FreezeOrThaw>) -> Result<()> {
    validate_freeze_authority(
        &ctx.accounts.operator_role,
        &ctx.accounts.operator.key(),
        &ctx.accounts.config.mint,
    )?;

    let clock = Clock::get()?;
    let mint_key = ctx.accounts.config.mint;
    let config_bump = ctx.accounts.config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[SEED_CONFIG, mint_key.as_ref(), &[config_bump]]];

    // Thaw the token account via CPI
    anchor_spl::token_2022::thaw_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::ThawAccount {
                account: ctx.accounts.target_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        ),
    )?;

    emit!(AccountThawed {
        mint: mint_key,
        target: ctx.accounts.target_token_account.key(),
        operator: ctx.accounts.operator.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
