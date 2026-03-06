#!/usr/bin/env bash
# Verify DEPLOYMENT.md program IDs match declare_id! in source
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

SSS_ID=$(grep 'declare_id!' "$ROOT_DIR/programs/sss-token/src/lib.rs" | grep -oP '"[^"]+"' | tr -d '"')
HOOK_ID=$(grep 'declare_id!' "$ROOT_DIR/programs/transfer-hook/src/lib.rs" | grep -oP '"[^"]+"' | tr -d '"')

echo "Source IDs:"
echo "  sss-token:     $SSS_ID"
echo "  transfer-hook: $HOOK_ID"

grep -q "$SSS_ID" "$ROOT_DIR/DEPLOYMENT.md" || (echo "ERROR: sss-token ID mismatch in DEPLOYMENT.md" && exit 1)
grep -q "$HOOK_ID" "$ROOT_DIR/DEPLOYMENT.md" || (echo "ERROR: transfer-hook ID mismatch in DEPLOYMENT.md" && exit 1)
echo "Program IDs verified OK"
