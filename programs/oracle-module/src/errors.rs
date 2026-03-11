//! Oracle module error codes.

use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Oracle feed is not active")]
    OracleNotActive,

    #[msg("Oracle feed is stale — price data too old")]
    StaleFeed,

    #[msg("Price out of bounds — outside configured min/max range")]
    PriceOutOfBounds,

    #[msg("Invalid amount — must be greater than zero")]
    InvalidAmount,

    #[msg("Not authorized to update oracle config")]
    NotAuthorized,
}
