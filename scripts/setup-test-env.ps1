# setup-test-env.ps1 — Sets required environment variables for cargo test-sbf and Anchor tests
# Usage: .\scripts\setup-test-env.ps1

Write-Host "=== SSS Test Environment Setup ==="

# Set HOME if not already set (required by Solana CLI tools)
if (-not $env:HOME) {
    $env:HOME = $env:USERPROFILE
    Write-Host "Set HOME=$env:HOME"
} else {
    Write-Host "HOME already set: $env:HOME"
}

# Verify Solana config directory exists
$solanaConfigDir = Join-Path $env:HOME ".config\solana"
if (-not (Test-Path $solanaConfigDir)) {
    Write-Host "Initializing Solana config..."
    solana config set --url devnet
} else {
    Write-Host "Solana config directory exists: $solanaConfigDir"
}

# Set ANCHOR_WALLET for TypeScript tests
$testKeypairPath = Join-Path (Get-Location) "test-keypair.json"
if (-not (Test-Path $testKeypairPath)) {
    Write-Host "Generating test keypair..."
    solana-keygen new --no-bip39-passphrase --outfile $testKeypairPath --force
}
$env:ANCHOR_WALLET = $testKeypairPath
Write-Host "Set ANCHOR_WALLET=$testKeypairPath"

# Set ANCHOR_PROVIDER_URL
$env:ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899"
Write-Host "Set ANCHOR_PROVIDER_URL=$env:ANCHOR_PROVIDER_URL"

Write-Host ""
Write-Host "=== Environment ready ==="
Write-Host "You can now run:"
Write-Host "  cargo test --workspace"
Write-Host "  cargo test-sbf"
Write-Host "  yarn test:unit"
