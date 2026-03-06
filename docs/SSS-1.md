# SSS-1 Specification — Basic Stablecoin

## Conformance Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Normative Requirements

- An SSS-1 implementation **MUST** create a `StablecoinConfig` PDA at seed `["stablecoin_config", mint]` upon initialization.
- An SSS-1 implementation **MUST** create a `PauseState` PDA at seed `["pause_state", mint]` upon initialization.
- The `pause` instruction **SHALL** block all `mint_tokens`, `burn_tokens`, and token transfer operations while `PauseState.paused` is `true`.
- The `pause` instruction **MUST NOT** block `freeze_account`, `thaw_account`, `add_to_blacklist`, or `seize` operations.
- The `mint_tokens` instruction **MUST** check and decrement the minter's quota before minting.
- A minter's quota **SHALL** be enforced within the configured period (daily / weekly / monthly / unlimited).
- The `freeze_account` instruction **MUST** require the operator to hold MasterAuthority or Blacklister role.
- Extension flags (`enable_permanent_delegate`, `enable_transfer_hook`, `default_account_frozen`) **MUST NOT** be modifiable after initialization.
- Every instruction with a role check **SHALL** return `SssError::NotAuthorized` when the signer does not hold the required role.
- The `transfer_authority` instruction **MUST** atomically deactivate the old MasterAuthority role and create the new one in a single transaction.

## Overview

SSS-1 is the foundational tier providing core stablecoin functionality:
mint, burn, freeze, pause, and role-based access control.

**No Token-2022 extensions are enabled** — SSS-1 uses a standard Token-2022 mint without PermanentDelegate, TransferHook, or DefaultAccountState.

## Features

| Feature | Supported | Description |
|---------|-----------|-------------|
| Mint | ✅ | Quota-enforced minting |
| Burn | ✅ | Burner-role holders can burn from own account |
| Freeze/Thaw | ✅ | Operator can freeze individual accounts |
| Pause/Unpause | ✅ | Global pause of all operations |
| Roles | ✅ | 5 roles: Master, Minter, Burner, Pauser, Blacklister |
| Blacklist | ❌ | SSS-2 only |
| Seize | ❌ | SSS-2 only |
| Transfer Hook | ❌ | SSS-2 only |

## Initialization

```typescript
import { sss1Preset } from "@stbr/sss-token";

const args = sss1Preset("USD Stablecoin", "USDS", "https://meta.example.com", 6);
// Result:
// {
//   name: "USD Stablecoin",
//   symbol: "USDS",
//   uri: "https://meta.example.com",
//   decimals: 6,
//   enablePermanentDelegate: false,
//   enableTransferHook: false,
//   defaultAccountFrozen: false,
// }
```

## Workflow

### 1. Initialize
Authority creates the stablecoin → becomes MasterAuthority.

### 2. Configure Roles
MasterAuthority grants Minter, Burner, Pauser roles to operators.

### 3. Set Quotas
MasterAuthority sets per-minter quotas (daily/weekly/monthly/unlimited).

### 4. Operate
- Minters mint tokens (quota-enforced)
- Burners burn tokens
- Pausers can pause/unpause in emergencies

## On-Chain Accounts Created

| Account | Size | Rent |
|---------|------|------|
| StablecoinConfig | ~300 bytes | ~0.003 SOL |
| PauseState | ~80 bytes | ~0.001 SOL |
| RoleRecord (per role) | ~120 bytes | ~0.002 SOL |
| MinterQuota (per minter) | ~100 bytes | ~0.001 SOL |
