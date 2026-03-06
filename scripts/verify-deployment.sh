#!/usr/bin/env bash
# verify-deployment.sh — Validates that program IDs in DEPLOYMENT.md match
# the declare_id! macros in source and Anchor.toml.
#
# Usage: bash scripts/verify-deployment.sh
# Exit code: 0 = all IDs in sync, 1 = mismatch detected
#
# CRITICAL-2 FIX: Ensures DEPLOYMENT.md never drifts from source.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "=== SSS Deployment ID Sync Check ==="
echo ""

# ---------------------------------------------------------------------------
# Extract program IDs from source declare_id! macros
# ---------------------------------------------------------------------------
SSS_TOKEN_SOURCE=$(grep -oP 'declare_id!\("([^"]+)"\)' "$ROOT_DIR/programs/sss-token/src/lib.rs" | grep -oP '"[^"]+' | tr -d '"')
HOOK_SOURCE=$(grep -oP 'declare_id!\("([^"]+)"\)' "$ROOT_DIR/programs/transfer-hook/src/lib.rs" | grep -oP '"[^"]+' | tr -d '"')

echo "Source declare_id! values:"
echo "  sss-token:     $SSS_TOKEN_SOURCE"
echo "  transfer-hook: $HOOK_SOURCE"
echo ""

# ---------------------------------------------------------------------------
# Extract program IDs from Anchor.toml [programs.devnet]
# ---------------------------------------------------------------------------
SSS_TOKEN_ANCHOR=$(grep 'sss_token' "$ROOT_DIR/Anchor.toml" | head -1 | grep -oP '"[^"]+"' | tr -d '"')
HOOK_ANCHOR=$(grep 'transfer_hook' "$ROOT_DIR/Anchor.toml" | head -1 | grep -oP '"[^"]+"' | tr -d '"')

echo "Anchor.toml [programs] values:"
echo "  sss-token:     $SSS_TOKEN_ANCHOR"
echo "  transfer-hook: $HOOK_ANCHOR"
echo ""

# ---------------------------------------------------------------------------
# Extract program IDs from DEPLOYMENT.md
# ---------------------------------------------------------------------------
SSS_TOKEN_DEPLOY=$(grep 'sss-token' "$ROOT_DIR/DEPLOYMENT.md" | head -1 | grep -oP '`[^`]+`' | tr -d '`')
HOOK_DEPLOY=$(grep 'transfer-hook' "$ROOT_DIR/DEPLOYMENT.md" | head -1 | grep -oP '`[^`]+`' | tr -d '`')

echo "DEPLOYMENT.md values:"
echo "  sss-token:     $SSS_TOKEN_DEPLOY"
echo "  transfer-hook: $HOOK_DEPLOY"
echo ""

# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------
echo "--- Checking sss-token ---"
if [ "$SSS_TOKEN_SOURCE" = "$SSS_TOKEN_ANCHOR" ] && [ "$SSS_TOKEN_SOURCE" = "$SSS_TOKEN_DEPLOY" ]; then
    echo "  ✅ All three sources match: $SSS_TOKEN_SOURCE"
else
    echo "  ❌ MISMATCH DETECTED"
    [ "$SSS_TOKEN_SOURCE" != "$SSS_TOKEN_ANCHOR" ] && echo "     Source vs Anchor.toml: $SSS_TOKEN_SOURCE != $SSS_TOKEN_ANCHOR"
    [ "$SSS_TOKEN_SOURCE" != "$SSS_TOKEN_DEPLOY" ] && echo "     Source vs DEPLOYMENT.md: $SSS_TOKEN_SOURCE != $SSS_TOKEN_DEPLOY"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "--- Checking transfer-hook ---"
if [ "$HOOK_SOURCE" = "$HOOK_ANCHOR" ] && [ "$HOOK_SOURCE" = "$HOOK_DEPLOY" ]; then
    echo "  ✅ All three sources match: $HOOK_SOURCE"
else
    echo "  ❌ MISMATCH DETECTED"
    [ "$HOOK_SOURCE" != "$HOOK_ANCHOR" ] && echo "     Source vs Anchor.toml: $HOOK_SOURCE != $HOOK_ANCHOR"
    [ "$HOOK_SOURCE" != "$HOOK_DEPLOY" ] && echo "     Source vs DEPLOYMENT.md: $HOOK_SOURCE != $HOOK_DEPLOY"
    ERRORS=$((ERRORS + 1))
fi

echo ""
# ---------------------------------------------------------------------------
# Check for placeholder signatures in DEPLOYMENT.md
# ---------------------------------------------------------------------------
echo "--- Checking for placeholder signatures ---"
PENDING_COUNT=$(grep -c '\[PENDING' "$ROOT_DIR/DEPLOYMENT.md" || true)
FAKE_SIG_COUNT=$(grep -cP '^[A-Za-z0-9]{87,88}$' "$ROOT_DIR/DEPLOYMENT.md" || true)

if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "  ⚠️  $PENDING_COUNT [PENDING] placeholder(s) found — deployment not yet finalized"
fi
if [ "$FAKE_SIG_COUNT" -gt 0 ]; then
    echo "  ❌ $FAKE_SIG_COUNT potential fake signature(s) detected (standalone base58 strings)"
    ERRORS=$((ERRORS + 1))
fi
if [ "$PENDING_COUNT" -eq 0 ] && [ "$FAKE_SIG_COUNT" -eq 0 ]; then
    echo "  ✅ No placeholder or suspicious signatures found"
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
    echo "❌ FAILED: $ERRORS issue(s) found. Fix before submission."
    exit 1
else
    echo "✅ PASSED: All program IDs are in sync."
    exit 0
fi
