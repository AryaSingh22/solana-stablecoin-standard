> **LEGAL DISCLAIMER**
>
> This document and all referenced materials are provided for **informational and technical purposes only**. Nothing contained herein constitutes legal advice, regulatory guidance, or a legal opinion of any kind. The Solana Stablecoin Standard (SSS) is a technical framework; compliance with applicable laws—including but not limited to anti-money laundering (AML), know-your-customer (KYC), sanctions screening (OFAC), and securities regulations—is the **sole responsibility of the deploying entity**.
>
> The authors and contributors of SSS expressly disclaim all liability arising from the use, deployment, or reliance on this software in regulated financial contexts. **Consult qualified legal counsel before deploying any stablecoin in a regulated jurisdiction.**

# Compliance Guide


## Overview

The SSS compliance framework provides regulatory enforcement capabilities at three levels:

1. **On-chain** — Immutable rules enforced by program logic and Transfer Hook
2. **Backend** — Event indexing, audit trail, and webhook notifications
3. **CLI/SDK** — Operator tools for compliance management

## Compliance Operations

### Blacklist Management

```bash
# Add to blacklist (freezes account automatically)
sss-token blacklist --mint <pk> --target <wallet> --reason "OFAC SDN list"

# Check blacklist status
curl http://localhost:3003/blacklist/<mint>/<wallet>

# Remove from blacklist (does NOT auto-thaw)
sss-token unblacklist --mint <pk> --target <wallet>

# Explicitly thaw after removal
sss-token thaw --mint <pk> --target <token-account>
```

### Asset Seizure

```bash
# Pre-requisites: target must be blacklisted AND frozen
sss-token seize --mint <pk> --source-account <token-account> --treasury <treasury-account>
```

### Pause (Emergency)

```bash
# Immediately halt ALL token operations
sss-token pause --mint <pk>

# Resume operations
sss-token unpause --mint <pk>
```

## Audit Trail

All compliance events are immutable:
- **On-chain**: BlacklistEntry PDAs use active flag (never deleted)
- **Database**: ComplianceEvent rows with operator, reason, timestamp
- **CLI**: `~/.sss-token/audit.log` records all operations

### Querying Events

```bash
# All compliance events
curl http://localhost:3003/events/<mint>

# Filter by type
curl http://localhost:3003/events/<mint>?type=BLACKLIST_ADD

# Export CSV for regulators
curl http://localhost:3003/events/<mint>/export > compliance-report.csv
```

## Compliance Event Types

| Type | Description |
|------|-------------|
| `BLACKLIST_ADD` | Wallet added to blacklist |
| `BLACKLIST_REMOVE` | Wallet removed from blacklist |
| `FREEZE` | Token account frozen |
| `THAW` | Token account thawed |
| `SEIZE` | Assets seized from blacklisted account |
| `PAUSE` | Token operations paused |
| `UNPAUSE` | Token operations resumed |

## Webhook Notifications

Register webhooks to receive real-time compliance notifications:

```bash
# Register webhook
curl -X POST http://localhost:3004/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your.service/webhook", "events": ["BLACKLIST_ADD", "SEIZE"]}'

# Response includes HMAC secret for signature verification
```

## Regulatory Considerations

- SSS-2 is designed for institutional stablecoin issuers subject to AML/KYC regulations
- The TransferHook enforces compliance in real-time (cannot be bypassed by end users)
- PermanentDelegate enables lawful asset recovery (e.g., court orders)
- All operations produce an immutable audit trail suitable for regulatory reporting
