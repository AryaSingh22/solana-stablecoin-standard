# Deployment Record

**Network:** Devnet
**Anchor Version:** 0.30.1
**Solana CLI Version:** 1.18.4

## Program IDs

| Program | Address |
|---------|---------|
| sss-token | `HLvhfKVfGfKXVNS9tZ1q7SNS4w9mQmcjre758QFhbZDZ` |
| transfer-hook | `2wcwbEsw7rZ2t36qaDujHUc9HHrg3f5m4opcSHpixNUv` |

> **Note:** These program IDs match the `declare_id!` macros in `programs/sss-token/src/lib.rs` and `programs/transfer-hook/src/lib.rs`, as well as the `[programs.devnet]` section in `Anchor.toml`. Run `scripts/verify-ids.sh` to validate.

## How to Deploy and Verify

### Step 1: Build Programs

Build both programs (requires Linux/WSL):

```bash
anchor build
```

### Step 2: Deploy to Devnet

Use the provided deployment script:

```bash
bash scripts/deploy.sh devnet
```

The script will:
1. Run `anchor build`
2. Deploy both programs to the specified cluster
3. Capture the deployment transaction signatures
4. Run `scripts/verify-ids.sh` to confirm all IDs match

Alternatively, deploy manually:

```bash
solana config set --url devnet
solana airdrop 2

anchor deploy --program-name sss-token --provider.cluster devnet
anchor deploy --program-name transfer-hook --provider.cluster devnet
```

### Step 3: Verify Deployment

Run the verification script to confirm program IDs are in sync across source code, Anchor.toml, and this file:

```bash
bash scripts/verify-ids.sh
```

### Step 4: On-Chain Verification

Verify the programs are deployed on devnet:

```bash
solana program show HLvhfKVfGfKXVNS9tZ1q7SNS4w9mQmcjre758QFhbZDZ --url devnet
solana program show 2wcwbEsw7rZ2t36qaDujHUc9HHrg3f5m4opcSHpixNUv --url devnet
```

## Transaction Signatures

Transaction signatures are captured automatically by `scripts/deploy.sh` upon deployment. Run the deploy script against devnet to populate this section with real signatures:

```bash
bash scripts/deploy.sh devnet
```

The script outputs signatures for:
1. SSS-Token program deployment
2. Transfer Hook program deployment
3. SSS-1 token initialization
4. SSS-2 token initialization (with Transfer Hook + Permanent Delegate)
5. Mint operation
6. Blacklist operation (SSS-2)
7. Seize operation (SSS-2)

## Pre-Deployment Checklist

1. Build programs in Linux/WSL: `anchor build`
2. Note keypair public keys:
   ```bash
   solana-keygen pubkey target/deploy/sss_token-keypair.json
   solana-keygen pubkey target/deploy/transfer_hook-keypair.json
   ```
3. Update `declare_id!` in both Rust source files with keys from step 2
4. Update `Anchor.toml` `[programs.devnet]` section with the same IDs
5. Rebuild: `anchor build`
6. Fund the deploy wallet: `solana airdrop 2 --url devnet`
7. Deploy: `anchor deploy`
8. Verify: `solana program show <PROGRAM_ID> --url devnet`
9. Run sync check: `bash scripts/verify-ids.sh`
