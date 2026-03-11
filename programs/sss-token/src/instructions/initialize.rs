//! Initialize instruction — creates a new stablecoin with Token-2022 extensions.
//!
//! This instruction:
//! 1. Creates the Token-2022 mint with configured extensions
//! 2. Creates the StablecoinConfig PDA
//! 3. Creates the PauseState PDA (paused: false)
//! 4. Creates the MasterAuthority RoleRecord PDA
//!
//! Extension flags (`enable_permanent_delegate`, `enable_transfer_hook`,
//! `default_account_frozen`) are immutable after this instruction completes.

use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::TokenInterface;

use crate::constants::*;
use crate::errors::SssError;
use crate::state::*;

/// Arguments for the initialize instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeArgs {
    /// Human-readable name for the stablecoin (max 32 bytes).
    pub name: String,
    /// Ticker symbol for the stablecoin (max 10 bytes).
    pub symbol: String,
    /// Metadata URI for off-chain metadata (max 200 bytes).
    pub uri: String,
    /// Number of decimal places for the token.
    pub decimals: u8,
    /// Whether to enable the permanent delegate extension.
    pub enable_permanent_delegate: bool,
    /// Whether to enable the transfer hook extension.
    pub enable_transfer_hook: bool,
    /// Whether new token accounts should be frozen by default.
    pub default_account_frozen: bool,
    /// The transfer hook program ID (required if enable_transfer_hook is true).
    pub hook_program_id: Option<Pubkey>,
    /// Whether to enable confidential transfers (SSS-3).
    pub enable_confidential_transfers: bool,
    /// Whether to enable allowlist-based access control (SSS-3).
    pub enable_allowlist: bool,
}

/// Accounts required for the initialize instruction.
#[derive(Accounts)]
#[instruction(args: InitializeArgs)]
pub struct Initialize<'info> {
    /// The authority who will become the MasterAuthority.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Token-2022 mint account to be created.
    /// This must be a new, uninitialized account.
    /// CHECK: We create and initialize this mint via CPI to Token-2022.
    #[account(mut)]
    pub mint: Signer<'info>,

    /// The stablecoin configuration PDA.
    #[account(
        init,
        payer = authority,
        space = STABLECOIN_CONFIG_SIZE,
        seeds = [SEED_CONFIG, mint.key().as_ref()],
        bump,
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// The pause state PDA — initialized to not paused.
    #[account(
        init,
        payer = authority,
        space = PAUSE_STATE_SIZE,
        seeds = [SEED_PAUSE, mint.key().as_ref()],
        bump,
    )]
    pub pause_state: Account<'info, PauseState>,

    /// The MasterAuthority role record PDA for the authority.
    #[account(
        init,
        payer = authority,
        space = ROLE_RECORD_SIZE,
        seeds = [
            SEED_ROLE,
            mint.key().as_ref(),
            authority.key().as_ref(),
            &[RoleType::MasterAuthority as u8],
        ],
        bump,
    )]
    pub master_role: Account<'info, RoleRecord>,

    /// Token-2022 program.
    pub token_program: Interface<'info, TokenInterface>,

    /// System program for account creation.
    pub system_program: Program<'info, System>,

    /// Rent sysvar.
    pub rent: Sysvar<'info, Rent>,
}

/// Event emitted when a new stablecoin is initialized.
#[event]
pub struct StablecoinInitialized {
    /// The mint address of the new stablecoin.
    pub mint: Pubkey,
    /// The authority who initialized the stablecoin.
    pub authority: Pubkey,
    /// The token name.
    pub name: String,
    /// The token symbol.
    pub symbol: String,
    /// Number of decimals.
    pub decimals: u8,
    /// Whether permanent delegate is enabled.
    pub enable_permanent_delegate: bool,
    /// Whether transfer hook is enabled.
    pub enable_transfer_hook: bool,
    /// Whether accounts are frozen by default.
    pub default_account_frozen: bool,
    /// Unix timestamp of initialization.
    pub timestamp: i64,
}

/// Handler for the initialize instruction.
///
/// Creates a Token-2022 mint with the configured extensions and initializes
/// all required PDA accounts for the stablecoin.
pub fn initialize_handler(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
    // Validate string lengths
    require!(args.name.len() <= MAX_NAME_LEN, SssError::NameTooLong);
    require!(args.symbol.len() <= MAX_SYMBOL_LEN, SssError::SymbolTooLong);
    require!(args.uri.len() <= MAX_URI_LEN, SssError::UriTooLong);

    // Validate transfer hook config
    if args.enable_transfer_hook {
        require!(args.hook_program_id.is_some(), SssError::InvalidConfig);
    }

    let clock = Clock::get()?;
    let mint_key = ctx.accounts.mint.key();
    let config_seeds = &[SEED_CONFIG, mint_key.as_ref()];
    let (_, config_bump) = Pubkey::find_program_address(config_seeds, ctx.program_id);

    // Determine the extensions to enable and compute required space for mint
    let extension_types = build_extension_list(&args);
    let mint_space = anchor_spl::token_2022::spl_token_2022::extension::ExtensionType::try_calculate_account_len::<
        anchor_spl::token_2022::spl_token_2022::state::Mint,
    >(&extension_types)?;

    // Create the mint account via system program
    let rent = &ctx.accounts.rent;
    let lamports = rent.minimum_balance(mint_space);

    anchor_lang::system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.mint.to_account_info(),
            },
        ),
        lamports,
        mint_space as u64,
        &token_2022::ID,
    )?;

    // Initialize extensions before mint initialization (Token-2022 requirement)
    let mint_info = ctx.accounts.mint.to_account_info();

    // 1. Permanent delegate extension
    if args.enable_permanent_delegate {
        // The delegate is the config PDA itself (program-controlled, not an EOA)
        let delegate = ctx.accounts.config.key();
        invoke_initialize_permanent_delegate(&mint_info, &delegate)?;
    }

    // 2. Transfer hook extension
    if args.enable_transfer_hook {
        let hook_program_id = args.hook_program_id.ok_or(SssError::InvalidConfig)?;
        invoke_initialize_transfer_hook(&mint_info, &ctx.accounts.authority.key(), &hook_program_id)?;
    }

    // 3. Default account state extension (frozen by default)
    if args.default_account_frozen {
        invoke_initialize_default_account_state(
            &mint_info,
            anchor_spl::token_2022::spl_token_2022::state::AccountState::Frozen,
        )?;
    }

    // Initialize the mint itself
    // Mint authority = config PDA, Freeze authority = config PDA
    let config_key = ctx.accounts.config.key();
    anchor_spl::token_2022::initialize_mint2(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::InitializeMint2 {
                mint: ctx.accounts.mint.to_account_info(),
            },
        ),
        args.decimals,
        &config_key,
        Some(&config_key),
    )?;

    // Initialize StablecoinConfig PDA
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.mint = mint_key;
    config.name = args.name.clone();
    config.symbol = args.symbol.clone();
    config.uri = args.uri.clone();
    config.decimals = args.decimals;
    config.enable_permanent_delegate = args.enable_permanent_delegate;
    config.enable_transfer_hook = args.enable_transfer_hook;
    config.default_account_frozen = args.default_account_frozen;
    config.enable_confidential_transfers = args.enable_confidential_transfers;
    config.enable_allowlist = args.enable_allowlist;
    config.paused = false;
    config.total_minted = 0;
    config.total_burned = 0;
    config.bump = config_bump;

    // Initialize PauseState PDA
    let pause_state = &mut ctx.accounts.pause_state;
    pause_state.mint = mint_key;
    pause_state.paused = false;
    pause_state.paused_at = 0;
    pause_state.paused_by = Pubkey::default();
    pause_state.bump = ctx.bumps.pause_state;

    // Initialize MasterAuthority RoleRecord
    let master_role = &mut ctx.accounts.master_role;
    master_role.mint = mint_key;
    master_role.holder = ctx.accounts.authority.key();
    master_role.role = RoleType::MasterAuthority;
    master_role.active = true;
    master_role.granted_at = clock.unix_timestamp;
    master_role.bump = ctx.bumps.master_role;

    // Emit event
    emit!(StablecoinInitialized {
        mint: mint_key,
        authority: ctx.accounts.authority.key(),
        name: args.name,
        symbol: args.symbol,
        decimals: args.decimals,
        enable_permanent_delegate: args.enable_permanent_delegate,
        enable_transfer_hook: args.enable_transfer_hook,
        default_account_frozen: args.default_account_frozen,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Builds the list of Token-2022 extensions to enable based on the init args.
fn build_extension_list(
    args: &InitializeArgs,
) -> Vec<anchor_spl::token_2022::spl_token_2022::extension::ExtensionType> {
    let mut extensions = Vec::new();
    if args.enable_permanent_delegate {
        extensions.push(
            anchor_spl::token_2022::spl_token_2022::extension::ExtensionType::PermanentDelegate,
        );
    }
    if args.enable_transfer_hook {
        extensions.push(
            anchor_spl::token_2022::spl_token_2022::extension::ExtensionType::TransferHook,
        );
    }
    if args.default_account_frozen {
        extensions.push(
            anchor_spl::token_2022::spl_token_2022::extension::ExtensionType::DefaultAccountState,
        );
    }
    extensions
}

/// Invokes the Token-2022 permanent delegate initialization.
fn invoke_initialize_permanent_delegate(
    mint_info: &AccountInfo,
    delegate: &Pubkey,
) -> Result<()> {
    let ix = anchor_spl::token_2022::spl_token_2022::instruction::initialize_permanent_delegate(
        &token_2022::ID,
        mint_info.key,
        delegate,
    )?;
    anchor_lang::solana_program::program::invoke(&ix, std::slice::from_ref(mint_info))?;
    Ok(())
}

/// Invokes the Token-2022 transfer hook initialization.
fn invoke_initialize_transfer_hook(
    mint_info: &AccountInfo,
    authority: &Pubkey,
    hook_program_id: &Pubkey,
) -> Result<()> {
    let ix =
        anchor_spl::token_2022::spl_token_2022::extension::transfer_hook::instruction::initialize(
            &token_2022::ID,
            mint_info.key,
            Some(*authority),
            Some(*hook_program_id),
        )?;
    anchor_lang::solana_program::program::invoke(&ix, std::slice::from_ref(mint_info))?;
    Ok(())
}

/// Invokes the Token-2022 default account state initialization.
fn invoke_initialize_default_account_state(
    mint_info: &AccountInfo,
    state: anchor_spl::token_2022::spl_token_2022::state::AccountState,
) -> Result<()> {
    let ix =
        anchor_spl::token_2022::spl_token_2022::extension::default_account_state::instruction::initialize_default_account_state(
            &token_2022::ID,
            mint_info.key,
            &state,
        )?;
    anchor_lang::solana_program::program::invoke(&ix, std::slice::from_ref(mint_info))?;
    Ok(())
}
