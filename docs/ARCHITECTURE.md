# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Solana Blockchain                         │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   SSS-Token       │  │  Transfer Hook    │                    │
│  │   (13 ixns)       │◄─│  (pause/blacklist)│                    │
│  └────────┬─────────┘  └──────────────────┘                     │
│           │ Token-2022 Extensions                                │
│           │ • PermanentDelegate  • TransferHook                  │
│           │ • DefaultAccountState                                │
└───────────┼─────────────────────────────────────────────────────┘
            │
    ┌───────┴───────┐
    │   SDK / CLI   │  (@stbr/sss-token, sss-token CLI)
    └───────┬───────┘
            │
┌───────────┼─────────────────────────────────────────────────────┐
│  Backend  │                                                      │
│  ┌────────┴────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  mint-service   │  │   indexer   │  │ compliance-service  │ │
│  │  (mint/burn)    │  │ (events)    │  │ (blacklist/audit)   │ │
│  └────────┬────────┘  └──────┬──────┘  └──────────┬──────────┘ │
│           │                  │                     │            │
│  ┌────────┴──────────────────┴─────────────────────┤            │
│  │                PostgreSQL + Redis                │            │
│  └──────────────────────────────────────────────────┘            │
│  ┌─────────────────┐                                            │
│  │ webhook-service  │  → External integrations                   │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## On-Chain Architecture

### PDA Structure

All PDAs are derived from the **mint address** for consistent addressing:

| PDA | Seeds | Purpose |
|-----|-------|---------|
| `StablecoinConfig` | `["config", mint]` | Global configuration |
| `PauseState` | `["pause_state", mint]` | Pause flag |
| `RoleRecord` | `["role", mint, holder, role_type]` | Role assignment |
| `MinterQuota` | `["minter_quota", mint, minter]` | Mint rate limiting |
| `BlacklistEntry` | `["blacklist", mint, wallet_authority]` | Compliance blacklist (uses wallet owner, not token account) |
| `ExtraAccountMetaList` | `["extra-account-metas", mint]` | Transfer hook metadata |

### Authority Model

The **Config PDA** acts as the program-controlled authority for the Token-2022 mint:
- Mint authority → Config PDA (CPI with PDA signer)
- Freeze authority → Config PDA
- This enables program-enforced rules for all token operations

### Transfer Hook Flow

```
User initiates transfer
    │
    ▼
Token-2022 calls TransferHook.execute()
    │
    ├── Check PauseState → Reject if paused
    │
    └── Check BlacklistEntry (sender & recipient) → Reject if blacklisted
```

## Data Flow

### Mint Operation

```
1. Operator calls CLI/SDK → mintTokens()
2. SDK derives PDAs (config, pause, role, quota)
3. SDK builds Anchor instruction
4. Transaction submitted to Solana
5. On-chain: validate role → check pause → check quota → CPI mint_to
6. Indexer picks up event → writes to PostgreSQL
7. Webhook service delivers to registered endpoints
```

### Compliance Event

```
1. Blacklister calls addToBlacklist()
2. On-chain: creates BlacklistEntry PDA + freezes token account
3. Subsequent transfers: TransferHook.execute() blocks
4. Indexer writes ComplianceEvent to database
5. Compliance service exposes API for audit queries
```

## Database Schema

7 models across 3 domains:

- **Token**: `Stablecoin`, `MintOperation`, `BurnOperation`
- **Compliance**: `ComplianceEvent`
- **Webhook**: `Webhook`, `WebhookDelivery`
- **Indexer**: `IndexerState`

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **On-chain** | Role-based access (6 roles), PDA authority, quota enforcement |
| **Transfer** | Real-time hook enforcement (pause + blacklist) |
| **Audit** | Immutable role records (deactivated, never deleted) |
| **Backend** | HMAC webhook signing, structured audit logging |
