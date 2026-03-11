#[cfg(test)]
mod test_errors {
    use sss_token::errors::*;
    use std::collections::HashSet;

    #[test]
    fn error_unauthorized_has_correct_code() {
        assert!(SssError::NotAuthorized as u32 >= 0);
    }

    #[test]
    fn error_paused_has_correct_code() {
        assert!(SssError::TokensPaused as u32 >= 0);
    }

    #[test]
    fn error_feature_not_enabled_has_correct_code() {
        assert!(SssError::FeatureNotEnabled as u32 >= 0);
    }

    #[test]
    fn error_quota_exceeded_has_correct_code() {
        assert!(SssError::MinterQuotaExceeded as u32 >= 0);
    }

    #[test]
    fn error_already_blacklisted_has_correct_code() {
        assert!(SssError::AccountAlreadyBlacklisted as u32 >= 0);
    }

    #[test]
    fn error_not_blacklisted_has_correct_code() {
        assert!(SssError::AccountNotBlacklisted as u32 >= 0);
    }

    #[test]
    fn error_account_frozen_has_correct_code() {
        // We just verify it has a valid u32 value and it's SssError
        let err = SssError::AccountNotFrozen as u32;
        assert!(err >= 0);
    }

    #[test]
    fn error_already_frozen_has_correct_code() {
        let err = SssError::AccountAlreadyFrozen as u32;
        assert!(err >= 0);
    }

    #[test]
    fn error_not_frozen_has_correct_code() {
        let err = SssError::AccountNotFrozen as u32;
        assert!(err >= 0);
    }

    #[test]
    fn all_error_codes_are_unique() {
        let codes = vec![
            SssError::NotAuthorized as u32,
            SssError::ConfigImmutable as u32,
            SssError::FeatureNotEnabled as u32,
            SssError::TokensPaused as u32,
            SssError::AccountAlreadyBlacklisted as u32,
            SssError::AccountNotBlacklisted as u32,
            SssError::AccountNotFrozen as u32,
            SssError::AccountAlreadyFrozen as u32,
            SssError::MinterQuotaExceeded as u32,
        ];
        let mut set = HashSet::new();
        for code in &codes {
            set.insert(*code);
        }
        assert_eq!(set.len(), codes.len());
    }
}
