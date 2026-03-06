# API Reference

## REST API Endpoints

All backend services expose JSON APIs over HTTP.

---

## Mint Service (Port 3001)

### `POST /mint`
Submit a mint request.

**Request Body:**
```json
{
  "mintAddress": "public key",
  "recipient": "public key",
  "amount": "string (raw units)"
}
```

**Response (200):**
```json
{
  "success": true,
  "signature": "<base58 tx signature>",
  "slot": 123456789,
  "amount": "1000000"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/mint \
  -H 'Content-Type: application/json' \
  -d '{"mintAddress": "<MINT_PUBKEY>", "recipient": "<RECIPIENT_PUBKEY>", "amount": "1000000"}'
```

### `POST /burn`
Submit a burn request.

**Request Body:**
```json
{
  "mintAddress": "public key",
  "amount": "string (raw units)"
}
```

**Response (200):**
```json
{
  "success": true,
  "signature": "<base58 tx signature>",
  "slot": 123456789,
  "amount": "1000000"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/burn \
  -H 'Content-Type: application/json' \
  -d '{"mintAddress": "<MINT_PUBKEY>", "amount": "500000"}'
```

### `GET /supply/:mint`
Get on-chain and database supply data for a mint.

**Response:**
```json
{
  "success": true,
  "data": {
    "mint": "<MINT_PUBKEY>",
    "totalMinted": "10000000",
    "totalBurned": "3000000",
    "currentSupply": "7000000"
  }
}
```

**Example:**
```bash
curl http://localhost:3001/supply/<MINT_PUBKEY>
```

### `GET /quota/:minter?mint=<pubkey>`
Get minter quota status.

**Response:**
```json
{
  "minter": "...",
  "mint": "...",
  "used": "3000000",
  "period": "lifetime"
}
```

### `GET /health`
Health check.

**Response:**
```json
{
  "status": "ok",
  "service": "mint-service",
  "uptime": 123.456,
  "version": "0.1.0",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Indexer (Port 3002)

### `GET /status`
Get indexer status.

**Response:**
```json
{
  "isRunning": true,
  "lastProcessedSlot": "123456789",
  "currentSlot": 123456800,
  "lag": 11,
  "programId": "..."
}
```

### `POST /reindex`
Trigger reindex from a specific slot.

**Request Body:**
```json
{ "fromSlot": 123456000 }
```

### `GET /health`

---

## Compliance Service (Port 3003)

### `GET /blacklist/:mint`
List all blacklist entries for a mint.

**Response:**
```json
{
  "mint": "...",
  "entries": [
    { "target": "...", "reason": "OFAC", "addedAt": "...", "active": true }
  ],
  "total": 1
}
```

### `GET /blacklist/:mint/:target`
Check if a specific wallet is blacklisted.

**Response:**
```json
{
  "mint": "...",
  "target": "...",
  "blacklisted": true,
  "entry": { "reason": "...", "addedAt": "..." }
}
```

### `GET /events/:mint`
Get compliance event history.

**Query Parameters:** `page`, `limit`, `type`

**Response:**
```json
{
  "mint": "...",
  "events": [],
  "page": 1,
  "limit": 50,
  "total": 0
}
```

### `GET /events/:mint/export`
Export compliance events as CSV.

**Response:** `text/csv`

### `GET /health`

---

## Webhook Service (Port 3004)

### `POST /subscriptions`
Register a new webhook subscription.

**Request Body:**
```json
{
  "url": "https://your.service/webhook",
  "events": ["BLACKLIST_ADD", "SEIZE", "MINT"],
  "stablecoinId": "..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "url": "...",
    "secret": "<hmac_secret — store securely, shown only once>",
    "events": ["..."],
    "active": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "message": "Webhook registered. Store the secret securely — it won't be shown again."
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/subscriptions \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com/hook", "events": ["MINT", "BURN"]}'
```

### `GET /subscriptions`
List all active webhook subscriptions.

**Response:**
```json
{
  "success": true,
  "data": [{"id": "...", "url": "...", "events": [...], "active": true}],
  "total": 1
}
```

### `DELETE /subscriptions/:id`
Remove a webhook subscription.

**Response:**
```json
{
  "success": true,
  "data": { "id": "...", "status": "deleted" }
}
```

### `POST /deliver` (Internal)
Enqueue a webhook delivery (called by the indexer).

**Request Body:**
```json
{
  "event": "MINT",
  "mintAddress": "<pubkey>",
  "payload": {}
}
```

### `GET /deliveries/:id`
Check delivery status.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "event": "MINT",
    "status": "DELIVERED",
    "attempts": 1,
    "lastAttempt": "2026-01-01T00:00:00.000Z",
    "response": "HTTP 200"
  }
}
```

### `GET /health`

---

## Webhook Payload Format

```json
{
  "id": "delivery-uuid",
  "event": "BLACKLIST_ADD",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "mint": "...",
    "target": "...",
    "operator": "...",
    "reason": "...",
    "signature": "..."
  }
}
```

### Signature Verification

Webhook payloads are signed with HMAC-SHA256:

```
X-SSS-Signature: sha256=<hex_digest>
```

Verify:
```javascript
const crypto = require("crypto");
const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
const valid = `sha256=${expected}` === request.headers["x-sss-signature"];
```
