# Windows Development Guide

This document covers Windows-specific setup, known issues, and workarounds for developing the Solana Stablecoin Standard (SSS) project on Windows.

## Environment Setup for cargo test-sbf

Ensure the following environment variables are set before running `cargo test-sbf`:

- `HOME` must be set to `%USERPROFILE%` if not already set
- Solana config must be initialized: `solana config set --url devnet`

You can run the setup script to configure this automatically:

```powershell
.\scripts\setup-test-env.ps1
```

## Known Windows Issues

### cargo test-sbf on Windows

`cargo test-sbf` requires the Solana BPF/SBF toolchain which may encounter OS error 5 (Access Denied) on Windows. This is caused by insufficient permissions for the BPF linker or Windows Defender blocking toolchain binaries.

**Resolution (try in order):**

1. **Run the terminal as Administrator:**
   Right-click your terminal (PowerShell / Windows Terminal) → "Run as administrator".

2. **Fix target directory permissions:**
   ```powershell
   icacls .\target /grant "$env:USERNAME:(OI)(CI)F" /T
   ```

3. **Check for Windows Defender blocking BPF toolchain:**
   - Open Windows Security → Virus & threat protection → Protection history
   - Look for blocked items containing `cargo-build-sbf`, `llvm`, or `.cargo\bin`
   - Add exclusions for:
     - `%USERPROFILE%\.local\share\solana\install`
     - `%USERPROFILE%\.cargo\bin`
     - `<project root>\target`

4. **CI fallback:** If local execution is not possible, `cargo test-sbf` runs on
   ubuntu-latest in CI via `.github/workflows/ci.yml`.

### OS Error 32 — File Lock Conflict with cargo test

On Windows, `cargo test --workspace` may fail with OS error 32 (file lock conflict). This is caused by:
- A previous test run or build process holding a lock on files in the `target/` directory
- Multiple cargo/rust-analyzer processes running concurrently
- Stale incremental compilation artifacts

**Resolution:**

1. Kill stale processes:
   ```powershell
   Get-Process | Where-Object { $_.Name -match 'cargo|rustc|rust-analyzer' } | Stop-Process -Force
   ```

2. Delete stale lock files and incremental cache:
   ```powershell
   Remove-Item -Recurse -Force target\debug\.cargo-lock -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force target\debug\incremental -ErrorAction SilentlyContinue
   ```

3. Re-run tests:
   ```powershell
   cargo test --workspace
   ```

### cargo test-sbf — "Can't get home directory path"

The Solana BPF test toolchain requires `$HOME` to locate the Solana config directory. On Windows, `HOME` may not be set.

**Resolution:**

```powershell
$env:HOME = $env:USERPROFILE
solana config set --url devnet
cargo test-sbf
```

## anchor test on Windows

The Solana/Anchor toolchain requires `$HOME` to be set. Before running `anchor test`, run:

```powershell
$env:HOME = $env:USERPROFILE
```

Or use the provided test runner script:

```powershell
.\scripts\run-tests.ps1
```

`anchor test` requires a Linux environment because the Anchor test validator binary is only distributed for x86_64 Linux.

### Option A: WSL2 (Preferred)

If WSL2 with Ubuntu is available:

```powershell
wsl bash scripts/anchor-test-wsl.sh
```

### Option B: Docker

```bash
docker build -f docker/test.Dockerfile -t sss-anchor-test .
docker run --rm sss-anchor-test
```

### Option C: CI-Only

If neither WSL2 nor Docker is available locally, `anchor test` runs automatically on ubuntu-latest via the GitHub Actions CI workflow: `.github/workflows/anchor-test.yml`.

## Running Unit Tests

The TypeScript unit tests require an `ANCHOR_WALLET` environment variable pointing to a valid keypair file.

The `test:unit` script in `package.json` automatically sets `ANCHOR_WALLET` via `cross-env`:

```powershell
npm run test:unit
```

Or manually:

```powershell
# Generate a test keypair (first time only)
solana-keygen new --no-bip39-passphrase --outfile test-keypair.json

# Run tests
$env:ANCHOR_WALLET = ".\test-keypair.json"
yarn test:unit
```

The `.env.test` file at the project root pre-configures this for automated runs.

## SDK Vitest — EPERM / esbuild Spawn Error

On Windows, Vitest may encounter EPERM errors due to esbuild binary spawn issues. The SDK's `vitest.config.ts` is configured with `pool: 'forks'` and `singleFork: true` to avoid this.

If EPERM persists:

1. Delete and reinstall node_modules:
   ```powershell
   cd sdk
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Force package-lock.json
   npm install
   ```

2. Fix permissions on the esbuild binary:
   ```powershell
   icacls ".\node_modules\.bin\esbuild.exe" /grant "$env:USERNAME:F"
   ```

3. Add `sdk/node_modules/` to Windows Defender exclusions.

4. **CI fallback:** SDK vitest runs on ubuntu-latest via `.github/workflows/ts-tests.yml`.

On Windows x64, Vitest (via Rollup) requires the `@rollup/rollup-win32-x64-msvc` optional dependency:

```powershell
cd sdk
npm install --optional
# Or install explicitly:
npm install @rollup/rollup-win32-x64-msvc --save-optional
```
