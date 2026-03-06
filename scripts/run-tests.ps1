# Ensure HOME is set for Solana/Anchor toolchain compatibility on Windows
if (-not $env:HOME) { $env:HOME = $env:USERPROFILE }

# Ensure ANCHOR_WALLET is set
$testKeypairPath = Join-Path (Get-Location) "test-keypair.json"
if (-not (Test-Path $testKeypairPath)) {
    Write-Host "Generating test keypair..."
    solana-keygen new --no-bip39-passphrase --outfile $testKeypairPath --force
}
$env:ANCHOR_WALLET = $testKeypairPath

Write-Host "HOME=$env:HOME"
Write-Host "ANCHOR_WALLET=$env:ANCHOR_WALLET"

# Run anchor test
Write-Host ""
Write-Host "=== Running anchor test ==="
anchor test 2>&1 | Tee-Object rerun3_anchor_test.log
