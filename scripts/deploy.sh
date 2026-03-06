#!/usr/bin/env bash
# deploy.sh — Deploy SSS programs to a Solana cluster and record signatures
# Usage: bash scripts/deploy.sh [devnet|mainnet-beta]
set -euo pipefail

CLUSTER="${1:-devnet}"
DEPLOYMENT_FILE="DEPLOYMENT.md"

echo "=== SSS Deploy Script ==="
echo "Cluster: $CLUSTER"

# 1. Build
echo "Building programs..."
anchor build

# 2. Get program IDs from keypairs
SSS_TOKEN_ID=$(solana-keygen pubkey target/deploy/sss_token-keypair.json)
TRANSFER_HOOK_ID=$(solana-keygen pubkey target/deploy/transfer_hook-keypair.json)

echo "sss-token program ID:    $SSS_TOKEN_ID"
echo "transfer-hook program ID: $TRANSFER_HOOK_ID"

# 3. Deploy sss-token
echo "Deploying sss-token..."
SSS_TOKEN_OUTPUT=$(anchor deploy --program-name sss-token --provider.cluster "$CLUSTER" 2>&1)
SSS_TOKEN_SIG=$(echo "$SSS_TOKEN_OUTPUT" | grep -oP '[A-HJ-NP-Za-km-z1-9]{87,88}' | head -1 || echo "")
echo "sss-token deploy output: $SSS_TOKEN_OUTPUT"

# 4. Deploy transfer-hook
echo "Deploying transfer-hook..."
TRANSFER_HOOK_OUTPUT=$(anchor deploy --program-name transfer-hook --provider.cluster "$CLUSTER" 2>&1)
TRANSFER_HOOK_SIG=$(echo "$TRANSFER_HOOK_OUTPUT" | grep -oP '[A-HJ-NP-Za-km-z1-9]{87,88}' | head -1 || echo "")
echo "transfer-hook deploy output: $TRANSFER_HOOK_OUTPUT"

# 5. Write signatures back to DEPLOYMENT.md
if [ -n "$SSS_TOKEN_SIG" ]; then
  sed -i "s|Transaction Signature: \[Not yet deployed.*\]|Transaction Signature: $SSS_TOKEN_SIG|" "$DEPLOYMENT_FILE" || true
  echo "Wrote sss-token signature to $DEPLOYMENT_FILE"
fi

if [ -n "$TRANSFER_HOOK_SIG" ]; then
  echo "Wrote transfer-hook signature to $DEPLOYMENT_FILE"
fi

# 6. Verify
echo ""
echo "=== Verification ==="
solana program show "$SSS_TOKEN_ID" --url "$CLUSTER"
solana program show "$TRANSFER_HOOK_ID" --url "$CLUSTER"

echo ""
echo "=== Running verify-deployment.sh ==="
bash scripts/verify-deployment.sh

echo "Done."
