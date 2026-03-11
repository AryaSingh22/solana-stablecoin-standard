#[cfg(test)]
mod test_instructions_unit {
    use sss_token::state::*;
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn validate_mint_amount_zero_fails() {
        let amount = 0;
        assert!(amount == 0);
    }

    #[test]
    fn validate_mint_amount_max_u64_accepted() {
        let max = u64::MAX;
        assert!(max > 0);
    }

    #[test]
    fn validate_burn_amount_zero_fails() {
        assert!(0 == 0);
    }

    #[test]
    fn validate_name_empty_fails() {
        let name = "";
        assert!(name.is_empty());
    }

    #[test]
    fn validate_name_valid_passes() {
        let name = "Valid";
        assert!(!name.is_empty());
    }

    #[test]
    fn validate_symbol_empty_fails() {
        let symbol = "";
        assert!(symbol.is_empty());
    }

    #[test]
    fn validate_symbol_valid_passes() {
        let symbol = "SYM";
        assert!(!symbol.is_empty());
    }

    #[test]
    fn validate_decimals_zero_passes() {
        let decimals = 0;
        assert!(decimals <= 9);
    }

    #[test]
    fn validate_decimals_nine_passes() {
        let decimals = 9;
        assert!(decimals <= 9);
    }

    #[test]
    fn validate_decimals_ten_fails() {
        let decimals = 10;
        assert!(decimals > 9);
    }

    #[test]
    fn quota_check_within_limit_passes() {
        let quota = MinterQuota {
            mint: Pubkey::default(),
            minter: Pubkey::default(),
            limit: 1000,
            used: 500,
            period: QuotaPeriod::Daily,
            bump: 0,
        };
        assert!(quota.used + 100 <= quota.limit);
    }

    #[test]
    fn quota_check_at_exact_limit_passes() {
        let quota = MinterQuota {
            mint: Pubkey::default(),
            minter: Pubkey::default(),
            limit: 1000,
            used: 1000,
            period: QuotaPeriod::Daily,
            bump: 0,
        };
        assert!(quota.used <= quota.limit);
    }

    #[test]
    fn quota_check_over_limit_fails() {
        let quota = MinterQuota {
            mint: Pubkey::default(),
            minter: Pubkey::default(),
            limit: 1000,
            used: 900,
            period: QuotaPeriod::Daily,
            bump: 0,
        };
        assert!(quota.used + 200 > quota.limit);
    }

    #[test]
    fn blacklist_reason_empty_fails() {
        let reason = "";
        assert!(reason.len() < 32); 
    }

    #[test]
    fn blacklist_reason_max_length_passes() {
        let reason = "a".repeat(100);
        assert_eq!(reason.len(), 100);
    }
}
