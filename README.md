# Solana Stablecoin Standard (SSS)

> A modular, production-grade stablecoin framework for Solana using Token-2022 extensions.

## Overview

SSS provides tiered stablecoin configurations with built-in compliance, role-based access control, and real-time transfer enforcement via Token-2022 extensions.

## Preset Comparison

| Feature | SSS-1 Minimal | SSS-2 Compliant |
|---------|--------------|-----------------|
| Mint / Burn | ✅ | ✅ |
| Freeze / Thaw | ✅ | ✅ |
| Pause / Unpause | ✅ | ✅ |
| Permanent Delegate | ❌ | ✅ |
| Transfer Hook | ❌ | ✅ |
| Blacklist Enforcement | ❌ | ✅ |
| Token Seizure | ❌ | ✅ |

## Quick Start

### Prerequisites

- Rust 1.75+, Solana CLI 1.18+, Anchor 0.30+, Node.js 20+

### Install CLI

```bash
npm install -g @stbr/sss-token-cli
```

### Initialize a Stablecoin

```bash
# Initialize an SSS-1 stablecoin
sss-token init --preset sss-1

# Initialize an SSS-2 compliant stablecoin
sss-token init --preset sss-2

# Mint tokens
sss-token mint <recipient> <amount>

# Check status
sss-token status
```

### SDK Usage

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
});
```

## Architecture

```
Layer 3 (Standards)   ┌──────────┐  ┌──────────┐
                      │  SSS-1   │  │  SSS-2   │
                      │ (Basic)  │  │(Compliant│
                      └────┬─────┘  └────┬─────┘
                           │              │
Layer 2 (Modules)    ┌─────┴──────────────┴─────┐
                     │  Role Mgmt │ Compliance   │
                     │  Quota     │ Blacklist    │
                     │  Pause     │ Seizure      │
                     └────────────┬──────────────┘
                                  │
Layer 1 (Base SDK)   ┌────────────┴──────────────┐
                     │ SolanaStablecoin (client)  │
                     │ Token-2022 CPI Operations  │
                     │ PDA Derivation             │
                     └───────────────────────────┘
```

## Repository Structure

```
solana-stablecoin-standard/
├── programs/
│   ├── sss-token/           # Main Anchor program (13 instructions)
│   └── transfer-hook/       # Compliance enforcement hook
├── sdk/                     # TypeScript SDK (@stbr/sss-token)
├── cli/                     # CLI tool (sss-token)
├── services/
│   ├── mint-service/        # Mint/burn API (Fastify)
│   └── webhook-service/     # Webhook delivery service
├── tests/                   # Anchor integration + unit tests
├── scripts/                 # Deploy, verify, and setup scripts
└── docs/                    # Documentation
```

## Programs

### SSS-Token (13 Instructions)

| Instruction | Description | Role Required |
|-------------|-------------|---------------|
| `initialize` | Create stablecoin with extensions | Setup |
| `mint_tokens` | Mint tokens (quota-enforced) | Minter |
| `burn_tokens` | Burn tokens | Burner |
| `freeze_account` | Freeze a token account | Master/Blacklister |
| `thaw_account` | Thaw a frozen account | Master/Blacklister |
| `pause` | Pause all operations | Pauser |
| `unpause` | Resume operations | Pauser |
| `update_minter` | Set minter quota | Master |
| `update_roles` | Grant/revoke roles | Master |
| `transfer_authority` | Transfer ownership | Master |
| `add_to_blacklist` | Blacklist wallet (SSS-2) | Blacklister |
| `remove_from_blacklist` | Un-blacklist wallet (SSS-2) | Blacklister |
| `seize` | Seize frozen assets (SSS-2) | Seizer |

### Transfer Hook

Real-time compliance enforcement during Token-2022 transfers:
- **Pause check** — blocks transfers when token is paused
- **Blacklist check** — blocks transfers from/to blacklisted wallets

## Role-Based Access Control

| Role | Permissions |
|------|------------|
| **MasterAuthority** | All operations, grant/revoke roles |
| **Minter** | Mint tokens (quota-limited) |
| **Burner** | Burn tokens from own account |
| **Pauser** | Pause/unpause operations |
| **Blacklister** | Add/remove blacklist, freeze/thaw |
| **Seizer** | Seize assets from blacklisted accounts |

## Backend Services

```bash
# Start all services
docker compose up -d
```

| Service | Port | Description |
|---------|------|-------------|
| `mint-service` | 3001 | Mint/burn API with quota management |
| `webhook-service` | 3004 | Webhook registration & delivery |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design and data flow
- [SDK Reference](docs/SDK.md) — TypeScript SDK API
- [Operations Guide](docs/OPERATIONS.md) — Deployment and operations
- [SSS-1 Specification](docs/SSS-1.md) — Basic stablecoin tier
- [SSS-2 Specification](docs/SSS-2.md) — Enhanced compliance tier
- [Compliance Guide](docs/COMPLIANCE.md) — Regulatory compliance
- [API Reference](docs/API.md) — Backend service endpoints

## Security

This software is in active development. **Do not use in production** without a professional security audit.

## License

MIT © Solana Stablecoin Standard Contributors
