# SSS Operations Runbook

> **Audience:** Stablecoin operators, compliance officers, and DevOps engineers.
>
> **Scope:** End-to-end procedures for operating an SSS stablecoin on Solana.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Deployment](#2-deployment)
3. [Minting Tokens](#3-minting-tokens)
4. [Burning Tokens](#4-burning-tokens)
5. [Freezing Accounts](#5-freezing-accounts)
6. [Blacklisting Wallets](#6-blacklisting-wallets)
7. [Seizing Tokens (SSS-2)](#7-seizing-tokens-sss-2)
8. [Pausing / Unpausing](#8-pausing--unpausing)
9. [Authority Rotation](#9-authority-rotation)
10. [Role Management](#10-role-management)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Emergency Procedures](#12-emergency-procedures)
13. [Backup & Recovery](#13-backup--recovery)
14. [Database Migrations](#14-database-migrations)
15. [Docker Operations](#15-docker-operations)

---

## 1. Prerequisites

### Environment Setup

| Tool             | Minimum Version | Purpose             |
|------------------|-----------------|----------------------|
| Solana CLI       | 1.18+           | Keypair & RPC mgmt  |
| Anchor CLI       | 0.30+           | Build & deploy       |
| Node.js          | 20 LTS          | CLI & services       |
| Docker Compose   | 2.20+           | Service orchestration|
| PostgreSQL       | 15+             | Event store          |
| Redis            | 7+              | Queue backend        |

### Required Environment Variables

```bash
# .env file (never commit real keys)
SOLANA_RPC_URL=https://api.devnet.solana.com
SSS_PROGRAM_ID=<your-deployed-program-id>
TRANSFER_HOOK_PROGRAM_ID=<your-hook-program-id>
DATABASE_URL=postgresql://sss:sss_dev_password@localhost:5432/sss_db
REDIS_URL=redis://localhost:6379
MINTER_KEYPAIR=<base64-or-json-array>
MASTER_KEYPAIR=<base64-or-json-array>
LOG_LEVEL=info
```

### Keypair Management

```bash
# Generate a new keypair (store securely - never share)
solana-keygen new --outfile ~/.config/solana/operator.json

# Display the public key
solana-keygen pubkey ~/.config/solana/operator.json
```

---

## 2. Deployment

### Step-by-Step Devnet Deployment

1. **Build the programs:**
   ```bash
   anchor build
   ```

2. **Note the generated program keypair public keys:**
   ```bash
   solana-keygen pubkey target/deploy/sss_token-keypair.json
   solana-keygen pubkey target/deploy/transfer_hook-keypair.json
   ```

3. **Update `declare_id!` in program source** (`programs/sss-token/src/lib.rs`, `programs/transfer-hook/src/lib.rs`) with the keys from step 2.

4. **Update `Anchor.toml`** with the same program IDs under the `[programs.devnet]` section.

5. **Rebuild after ID updates:**
   ```bash
   anchor build
   ```

6. **Deploy to devnet:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

7. **Verify deployment:**
   ```bash
   solana program show <PROGRAM_ID> --url devnet
   ```

### Mainnet Deployment

> ⚠️ **CAUTION:** Mainnet deployments are irreversible. Always test on devnet first.

1. Follow all devnet steps above, replacing `devnet` with `mainnet-beta`.
2. Ensure the deployer wallet has sufficient SOL (≥5 SOL recommended).
3. Set program upgrade authority to a multisig.

---

## 3. Minting Tokens

### Pre-conditions
- Caller MUST have the **Minter** role
- Minter MUST have sufficient remaining quota
- Token MUST NOT be paused

### Procedure

1. **Verify minter role:**
   ```bash
   sss-token roles --mint <MINT_ADDRESS> --holder <MINTER_PUBKEY>
   ```

2. **Check minter quota:**
   ```bash
   sss-token supply --mint <MINT_ADDRESS>
   ```

3. **Execute mint:**
   ```bash
   sss-token mint \
     --mint <MINT_ADDRESS> \
     --recipient <RECIPIENT_PUBKEY> \
     --amount <AMOUNT> \
     --keypair <MINTER_KEYPAIR_PATH>
   ```

4. **Verify on-chain:**
   ```bash
   sss-token status --mint <MINT_ADDRESS>
   ```

### Via Mint Service (API)

```bash
curl -X POST http://localhost:3001/mint \
  -H "Content-Type: application/json" \
  -d '{
    "mintAddress": "<MINT_ADDRESS>",
    "recipient": "<RECIPIENT_PUBKEY>",
    "amount": "1000000"
  }'
```

### Troubleshooting

| Issue                    | Resolution                                      |
|--------------------------|--------------------------------------------------|
| `QuotaExceeded`          | Wait for quota period reset or increase quota    |
| `TokenPaused`            | Unpause the token first                          |
| `Unauthorized`           | Verify caller has Minter role                    |
| Transaction timeout      | Retry — the service has 3-attempt backoff        |

---

## 4. Burning Tokens

### Pre-conditions
- Caller MUST have the **Burner** role
- Caller MUST hold the tokens being burned
- Token MUST NOT be paused

### Procedure

1. **Execute burn:**
   ```bash
   sss-token burn \
     --mint <MINT_ADDRESS> \
     --amount <AMOUNT> \
     --keypair <BURNER_KEYPAIR_PATH>
   ```

2. **Verify supply decreased:**
   ```bash
   sss-token supply --mint <MINT_ADDRESS>
   ```

### Via Mint Service (API)

```bash
curl -X POST http://localhost:3001/burn \
  -H "Content-Type: application/json" \
  -d '{
    "mintAddress": "<MINT_ADDRESS>",
    "amount": "500000"
  }'
```

---

## 5. Freezing Accounts

### Pre-conditions
- Caller MUST have **Blacklister** or **MasterAuthority** role
- Target token account MUST exist

### Procedure

1. **Freeze account:**
   ```bash
   sss-token freeze \
     --mint <MINT_ADDRESS> \
     --target <TARGET_TOKEN_ACCOUNT> \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```

2. **Verify frozen status:**
   ```bash
   solana account <TARGET_TOKEN_ACCOUNT> --url devnet
   ```

3. **Thaw account (when appropriate):**
   ```bash
   sss-token thaw \
     --mint <MINT_ADDRESS> \
     --target <TARGET_TOKEN_ACCOUNT> \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```

### Considerations
- Frozen accounts cannot send or receive tokens
- Always document the reason for freezing
- Double freeze attempts will fail gracefully

---

## 6. Blacklisting Wallets

> **SSS-2 only.** Requires `enable_transfer_hook` feature.

### Pre-conditions
- Caller MUST have **Blacklister** role
- Stablecoin MUST be SSS-2 preset

### Procedure

1. **Add to blacklist:**
   ```bash
   sss-token blacklist \
     --mint <MINT_ADDRESS> \
     --target <WALLET_ADDRESS> \
     --reason "OFAC sanctioned entity" \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```
   This also freezes the target's token account.

2. **Verify blacklist status:**
   ```bash
   curl http://localhost:3003/blacklist/<MINT_ADDRESS>/<WALLET_ADDRESS>
   ```

3. **Remove from blacklist (if required):**
   ```bash
   sss-token unblacklist \
     --mint <MINT_ADDRESS> \
     --target <WALLET_ADDRESS> \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```
   > **Note:** Removing from blacklist does NOT automatically thaw. Call `thaw` separately.

---

## 7. Seizing Tokens (SSS-2)

> ⚠️ **CRITICAL:** Token seizure is irreversible. This transfers ALL tokens from a frozen, blacklisted account to a treasury.

### Pre-conditions
- Caller MUST have **Seizer** role
- Target MUST be both frozen AND blacklisted
- Stablecoin MUST have `permanent_delegate` feature enabled

### Procedure

1. **Verify target is blacklisted and frozen:**
   ```bash
   curl http://localhost:3003/blacklist/<MINT_ADDRESS>/<TARGET_WALLET>
   ```

2. **Execute seizure:**
   ```bash
   sss-token seize \
     --mint <MINT_ADDRESS> \
     --source-authority <TARGET_WALLET> \
     --source-token <TARGET_TOKEN_ACCOUNT> \
     --treasury <TREASURY_TOKEN_ACCOUNT> \
     --keypair <SEIZER_KEYPAIR_PATH> \
     --confirm
   ```

3. **Generate audit report:**
   ```bash
   curl "http://localhost:3003/audit/<MINT_ADDRESS>?action=SEIZE&format=csv" > seizure_report.csv
   ```

---

## 8. Pausing / Unpausing

### Pause All Operations

1. **Pause:**
   ```bash
   sss-token pause \
     --mint <MINT_ADDRESS> \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```

2. **Verify paused:**
   ```bash
   sss-token status --mint <MINT_ADDRESS>
   # Output should show paused: true
   ```

### Resume Operations

1. **Unpause:**
   ```bash
   sss-token unpause \
     --mint <MINT_ADDRESS> \
     --keypair <OPERATOR_KEYPAIR_PATH> \
     --confirm
   ```

### When to Pause
- Security incident detected
- Smart contract vulnerability disclosed
- Regulatory hold order received
- Suspicious activity requiring investigation

---

## 9. Authority Rotation

> ⚠️ **CRITICAL:** Authority transfer is irreversible. The old authority loses ALL permissions.

### Pre-conditions
- Only the current **MasterAuthority** can transfer
- New authority wallet MUST be securely generated

### Procedure

1. **Generate new authority keypair:**
   ```bash
   solana-keygen new --outfile new-authority.json --no-bip39-passphrase
   ```

2. **Transfer authority:**
   ```bash
   sss-token transfer-authority \
     --mint <MINT_ADDRESS> \
     --new-authority <NEW_AUTHORITY_PUBKEY> \
     --keypair <CURRENT_AUTHORITY_PATH> \
     --confirm
   ```

3. **Immediately verify new authority works:**
   ```bash
   sss-token roles --mint <MINT_ADDRESS> --holder <NEW_AUTHORITY_PUBKEY>
   ```

4. **Securely archive old keypair** (do NOT delete — needed for audit trail).

---

## 10. Role Management

### Available Roles

| Role            | Permissions                              |
|-----------------|------------------------------------------|
| MasterAuthority | All operations, role management          |
| Minter          | Mint tokens (within quota)               |
| Burner          | Burn tokens from own account             |
| Pauser          | Pause/unpause operations                 |
| Blacklister     | Blacklist/freeze wallets (SSS-2)         |
| Seizer          | Seize tokens from blacklisted (SSS-2)    |

### Grant a Role

```bash
sss-token update-roles \
  --mint <MINT_ADDRESS> \
  --holder <WALLET_ADDRESS> \
  --role <ROLE_NAME> \
  --active true \
  --keypair <AUTHORITY_PATH> \
  --confirm
```

### Revoke a Role

```bash
sss-token update-roles \
  --mint <MINT_ADDRESS> \
  --holder <WALLET_ADDRESS> \
  --role <ROLE_NAME> \
  --active false \
  --keypair <AUTHORITY_PATH> \
  --confirm
```

### Set Minter Quota

```bash
sss-token update-minter \
  --mint <MINT_ADDRESS> \
  --minter <MINTER_PUBKEY> \
  --limit <MAX_AMOUNT> \
  --period <daily|weekly|monthly|lifetime> \
  --keypair <AUTHORITY_PATH>
```

---

## 11. Monitoring & Alerting

### Service Health Checks

```bash
# Quick health check for all services
for PORT in 3001 3002 3003 3004; do
  echo -n "Port $PORT: "
  curl -s http://localhost:$PORT/health | jq .status
done
```

### Indexer Status

```bash
curl -s http://localhost:3002/status | jq '{
  subscribed,
  lag,
  eventsProcessed,
  lastProcessedSlot
}'
```

### Webhook Delivery Monitoring

```bash
curl -s http://localhost:3004/health | jq .queue
```

### Audit Trail Export

```bash
# Full audit log
curl -s "http://localhost:3003/audit/<MINT_ADDRESS>" | jq .

# CSV export for compliance reports
curl -s "http://localhost:3003/events/<MINT_ADDRESS>/export" > compliance_report.csv

# Filtered by date range
curl -s "http://localhost:3003/audit/<MINT_ADDRESS>?from=2026-01-01&to=2026-02-01"
```

---

## 12. Emergency Procedures

### 🔴 Security Incident Response

1. **IMMEDIATELY pause the token:**
   ```bash
   sss-token pause --mint <MINT_ADDRESS> --keypair <AUTHORITY_PATH> --confirm
   ```

2. **Blacklist compromised wallets:**
   ```bash
   sss-token blacklist --mint <MINT_ADDRESS> --target <COMPROMISED_WALLET> \
     --reason "Security incident" --keypair <OPERATOR_PATH> --confirm
   ```

3. **Export audit trail for investigation:**
   ```bash
   curl "http://localhost:3003/audit/<MINT_ADDRESS>?format=csv" > incident_audit.csv
   ```

4. **Rotate authority if compromised:**
   ```bash
   sss-token transfer-authority --mint <MINT_ADDRESS> \
     --new-authority <EMERGENCY_AUTHORITY> --keypair <CURRENT_PATH> --confirm
   ```

5. **Document everything** — timestamps, actions taken, affected addresses.

### 🟡 Regulatory Hold

1. Pause the token.
2. Freeze specific accounts as directed.
3. Export compliance data for regulators.
4. Do NOT unpause until legal clearance.

### 🟢 Planned Maintenance

1. Announce maintenance window to stakeholders.
2. Optionally pause the token.
3. Perform maintenance.
4. Verify all health checks pass.
5. Unpause and announce completion.

---

## 13. Backup & Recovery

### Database Backups

```bash
# Manual backup
docker exec sss-postgres pg_dump -U sss sss_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i sss-postgres psql -U sss sss_db < backup_20260223.sql
```

### Keypair Backups

> ⚠️ **CRITICAL:** Losing the MasterAuthority keypair means permanent loss of control.

1. Store encrypted copies in multiple secure locations.
2. Use a hardware wallet for production deployments.
3. Maintain a secure key rotation schedule.

---

## 14. Database Migrations

```bash
# Generate migration after schema changes
cd services/shared
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy

# Reset database (DESTROYS ALL DATA)
npx prisma migrate reset
```

---

## 15. Docker Operations

### Starting Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f mint-service
```

### Stopping Services

```bash
# Graceful shutdown
docker compose down

# Remove volumes (DESTROYS DATA)
docker compose down -v
```

### Rebuilding After Code Changes

```bash
docker compose build --no-cache
docker compose up -d
```

### Configuration via docker-compose.yml

All services read configuration from environment variables defined in `docker-compose.yml`. See `.env.example` for the full list of available variables.
