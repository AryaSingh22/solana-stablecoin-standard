# Oracle Service

Fastify-based HTTP service for oracle price feed management.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/oracle/configure` | Configure oracle for a mint |
| GET | `/oracle/price` | Get current oracle price |
| POST | `/oracle/mint` | Execute price-gated mint |
| GET | `/health` | Health check |

## Environment Variables

- `SOLANA_RPC_URL` — Solana RPC endpoint
- `ORACLE_PROGRAM_ID` — Oracle module program ID
- `SSS_PROGRAM_ID` — SSS-Token program ID
- `PORT` — HTTP port (default: 3003)

## Development

```bash
npm install
npm run dev
```
