# SSS-2 Specification — Enhanced Compliance

## Conformance Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Normative Requirements

- An SSS-2 implementation **MUST** enable the `PermanentDelegate`, `TransferHook`, and `DefaultAccountState` Token-2022 extensions at initialization.
- The `enable_permanent_delegate`, `enable_transfer_hook`, and `default_account_frozen` extension flags **MUST NOT** be changeable after initialization.
- The `add_to_blacklist` instruction **SHALL** be feature-gated: it **MUST** require `config.enable_transfer_hook == true`, returning `SssError::FeatureNotEnabled` otherwise.
- The `add_to_blacklist` instruction **MUST** atomically create a `BlacklistEntry` PDA and freeze the target's token account in the same transaction.
- A `BlacklistEntry` record **SHALL NOT** be deleted; it **MUST** be deactivated by setting `active = false` to preserve the audit trail.
- The `seize` instruction **MUST** require both `config.enable_permanent_delegate == true` and `blacklist_entry.active == true` before transferring tokens.
- The transfer hook `execute` handler **MUST** reject any transfer where the source or destination has an active `BlacklistEntry`.
- The transfer hook `execute` handler **MUST** reject any transfer while `PauseState.paused == true`.
- The `BlacklistEntry.reason` field **SHALL** be stored as a UTF-8 `String` and **MUST NOT** exceed 100 bytes.
- All compliance events (blacklist, seize, pause) **MUST** emit on-chain events with operator, timestamp, and target fields.

## Overview

SSS-2 extends SSS-1 with enterprise compliance features using three Token-2022 extensions:

| Extension | Purpose |
|-----------|---------|
| **PermanentDelegate** | Enables asset seizure from any account |
| **TransferHook** | Real-time compliance enforcement on every transfer |
| **DefaultAccountState** | New accounts are frozen until explicitly approved |

## Features

| Feature | Description |
|---------|-------------|
| Blacklist | Add/remove wallets from compliance blacklist |
| Transfer Blocking | TransferHook blocks transfers involving blacklisted wallets or during pause |
| Asset Seizure | Seizer role can move tokens from frozen, blacklisted accounts to treasury |
| Default Frozen | New token accounts start frozen; must be thawed before use |
| Full Audit Trail | All compliance events recorded with operator, reason, timestamp |

## Initialization

```typescript
import { sss2Preset } from "@stbr/sss-token";

const args = sss2Preset(
  "Regulated USD",
  "RUSD",
  "https://regulated.example.com",
  hookProgramId,  // Transfer hook program ID
  6,
);
// Extensions: PermanentDelegate=true, TransferHook=true, DefaultFrozen=true
```

## Compliance Workflow

### Blacklisting

```
Blacklister → addToBlacklist(target, reason)
    1. Creates BlacklistEntry PDA (with reason, timestamp, operator)
    2. Freezes target's token account
    3. TransferHook now blocks all transfers involving target
```

### Asset Seizure

```
Seizer → seize(sourceTokenAccount, treasuryTokenAccount)
    Prerequisites: target must be blacklisted AND frozen
    1. Validates Seizer role + BlacklistEntry
    2. Uses PermanentDelegate to transfer tokens without owner signature
    3. Moves all tokens to treasury
```

### Un-blacklisting

```
Blacklister → removeFromBlacklist(target)
    1. Sets BlacklistEntry.active = false (record preserved for audit)
    2. Does NOT auto-thaw — explicit thawAccount() call required
```

## Transfer Hook Enforcement

Every Token-2022 transfer triggers the hook:

```
Execute handler:
  1. Load PauseState PDA → reject if paused
  2. Load BlacklistEntry for source → reject if active
  3. Load BlacklistEntry for destination → reject if active
  4. Allow transfer
```

## Role Matrix (SSS-2)

| Role | Standard Ops | Blacklist | Seize |
|------|-------------|-----------|-------|
| MasterAuthority | ✅ | — | — |
| Minter | mint | — | — |
| Burner | burn | — | — |
| Pauser | pause/unpause | — | — |
| Blacklister | freeze/thaw | ✅ add/remove | — |
| Seizer | — | — | ✅ seize |

## Additional On-Chain Accounts

| Account | Size | Rent |
|---------|------|------|
| BlacklistEntry (per target) | ~320 bytes | ~0.004 SOL |
| ExtraAccountMetaList (per mint) | ~200 bytes | ~0.002 SOL |
