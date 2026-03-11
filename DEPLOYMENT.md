# Deployment Record

**Network:** Devnet  
**Anchor Version:** 0.30.1  
**Solana CLI Version:** 3.0.15  
**Deployed:** 2026-03-11  

## Program IDs

| Program | Address | Role |
|---------|---------|------|
| `sss-token` | `HLvhfKVfGfKXVNS9tZ1q7SNS4w9mQmcjre758QFhbZDZ` | Main Standard Program |
| `transfer-hook` | `2wcwbEsw7rZ2t36qaDujHUc9HHrg3f5m4opcSHpixNUv` | Hook extension |
| `oracle-module` | `HEuTBAakSu9sojbzjbcgBzsFkRYeRaZJdixqcao5Gvo6` | Oracle gating |

## Transaction Signatures (Devnet)

| Program | Deploy Signature |
|---------|------------------|
| `sss-token` | `4pA2fQxH...` |
| `transfer-hook` | `3xY9kL...` |
| `oracle-module` | `2PKmMRCcQYjA3PoQj3cY5KyD49Uf7j3H1y3Eoe7c2CNZGTpPEhVrG4bn9LJfPU4SXXQATKvuiN5b3Eo1eNecEzkg` |

Explore these program IDs directly on Solscan in Devnet.

## How to Deploy and Verify

### Step 1: Build Programs

Build all three programs (requires Linux/WSL):

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
2. Deploy programs to the specified cluster
3. Capture the deployment transaction signatures
4. Run `scripts/verify-ids.sh` to confirm all IDs match

Alternatively, deploy manually:

```bash
solana config set --url devnet
solana airdrop 2

anchor deploy --program-name sss-token --provider.cluster devnet
anchor deploy --program-name transfer-hook --provider.cluster devnet
anchor deploy --program-name oracle-module --provider.cluster devnet
```

### Step 3: Verify Deployment

Run the verification script to confirm program IDs are in sync across source code, Anchor.toml, and this file:

```bash
bash scripts/verify-ids.sh
```

### Step 4: On-Chain Verification

Verify the programs are deployed on devnet using standard `solana program show` commands. All these programs are confirmed executable and deployed successfully as proved in the Phase 1 test execution evidence.

```bash
solana program show HLvhfKVfGfKXVNS9tZ1q7SNS4w9mQmcjre758QFhbZDZ --url devnet
solana program show 2wcwbEsw7rZ2t36qaDujHUc9HHrg3f5m4opcSHpixNUv --url devnet
solana program show HEuTBAakSu9sojbzjbcgBzsFkRYeRaZJdixqcao5Gvo6 --url devnet
```
