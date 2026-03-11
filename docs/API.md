# API Reference

The Solana Stablecoin Standard (SSS) backend is composed of four distinct microservices exposing RESTful JSON APIs.

---

## 1. Mint Service (Port 3001)

Handles minting, burning, and quota tracking.

### `POST /mint`
Mint tokens to a recipient (enforces MinterQuota on-chain).

**Request Schema:**
```json
{
  "mintAddress": "string (base58 pubkey)",
  "recipient": "string (base58 pubkey)",
  "amount": "string (u64 raw units)"
}
```

**Response Schema (200 OK):**
```json
{
  "success": true,
  "signature": "string (base58 tx sig)",
  "slot": 123456789,
  "amount": "1000000"
}
```

### `POST /burn`
Burn tokens from the burner's associated token account.

**Request Schema:**
```json
{
  "mintAddress": "string (base58 pubkey)",
  "amount": "string (u64 raw units)"
}
```

**Response Schema (200 OK):**
```json
{
  "success": true,
  "signature": "string (base58 tx sig)"
}
```

---

## 2. Webhook Service (Port 3002)

Manages subscriptions and delivery of on-chain compliance and mint events.

### `POST /subscriptions`
Register a new webhook listener.

**Request Schema:**
```json
{
  "url": "string (https url)",
  "events": ["array of strings (BLACKLIST_ADD, SEIZE, MINT)"],
  "stablecoinId": "string (base58 mint address)"
}
```

**Response Schema (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "string (uuid)",
    "url": "string",
    "secret": "string (HMAC secret - ONLY SHOWN ONCE)",
    "events": ["..."],
    "active": true
  }
}
```

### `GET /deliveries/:id`
Check the status of a specific event delivery.

**Response Schema (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string (PENDING, DELIVERED, FAILED)",
    "attempts": 1,
    "lastAttempt": "ISO-8601 string",
    "responseCode": 200
  }
}
```

---

## 3. Compliance Service (Port 3003)

Exposes audit trails and real-time verification for AML/KYC.

### `GET /blacklist/:mint/:target`
Check if a specific wallet is currently blacklisted.

**Response Schema (200 OK):**
```json
{
  "mint": "string (base58)",
  "target": "string (base58)",
  "blacklisted": true,
  "entry": {
    "reason": "string",
    "addedAt": "ISO-8601 timestamp"
  }
}
```

### `GET /audit/:mint`
Query the immutable history of all compliance actions.

**Query Parameters:** 
- `action` (optional): Filter by `SEIZE`, `BLACKLIST_ADD`, `FREEZE`.
- `format` (optional): `json` or `csv`.

**Response Schema (200 OK):**
```json
{
  "mint": "string (base58)",
  "events": [
    {
      "eventId": "uuid",
      "timestamp": "ISO-8601",
      "actionType": "SEIZE",
      "operator": "string (val)",
      "targetWallet": "string (val)",
      "amountSeized": "1000000",
      "txSignature": "string"
    }
  ],
  "total": 1
}
```

---

## 4. Oracle Service (Port 3004)

Manages external price feed integrations for SSS-gated mints.

### `GET /oracle/status/:mint`
Check if a mint is currently pegged and eligible for minting operations.

**Response Schema (200 OK):**
```json
{
  "mint": "string (base58)",
  "feedAddress": "string (base58 Switchboard/Pyth account)",
  "currentPrice": "1.0003",
  "minPrice": "0.9950",
  "maxPrice": "1.0050",
  "isPegMaintained": true,
  "stalenessSeconds": 12,
  "maxStaleness": 60
}
```

### `POST /oracle/update`
Internal endpoint: trigger an on-chain config update for the oracle feed boundaries.

**Request Schema:**
```json
{
  "mint": "string",
  "minPrice": "string (u64 scaled)",
  "maxPrice": "string (u64 scaled)",
  "maxStaleness": 60
}
```
