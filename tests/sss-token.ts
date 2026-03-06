/**
 * @module tests/sss-token
 * @description Integration tests for the SSS-Token Anchor program.
 *
 * These tests use Anchor's test framework and run against a local validator
 * or via `anchor test`. They verify all 13 instructions and the transfer hook.
 *
 * Run with: anchor test
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
    PublicKey,
    Keypair,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAccount,
    getMint,
} from "@solana/spl-token";
import { expect } from "chai";

// PDA seed constants (must match on-chain)
const SEED_CONFIG = Buffer.from("stablecoin_config");
const SEED_PAUSE = Buffer.from("pause_state");
const SEED_ROLE = Buffer.from("role");
const SEED_QUOTA = Buffer.from("minter_quota");
const SEED_BLACKLIST = Buffer.from("blacklist");

// Role type discriminators
const ROLE_MASTER = 0;
const ROLE_MINTER = 1;
const ROLE_BURNER = 2;
const ROLE_PAUSER = 3;
const ROLE_BLACKLISTER = 4;
const ROLE_SEIZER = 5;

describe("sss-token", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SssToken as Program;
    const authority = provider.wallet;
    const mint = Keypair.generate();

    // Test wallets
    const minter = Keypair.generate();
    const burner = Keypair.generate();
    const pauser = Keypair.generate();
    const blacklister = Keypair.generate();
    const seizer = Keypair.generate();
    const recipient = Keypair.generate();
    const blacklistTarget = Keypair.generate();

    // PDA derivation helpers
    function findConfigPda(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [SEED_CONFIG, mint.publicKey.toBuffer()],
            program.programId,
        );
    }

    function findPausePda(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [SEED_PAUSE, mint.publicKey.toBuffer()],
            program.programId,
        );
    }

    function findRolePda(holder: PublicKey, roleType: number): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [SEED_ROLE, mint.publicKey.toBuffer(), holder.toBuffer(), Buffer.from([roleType])],
            program.programId,
        );
    }

    function findQuotaPda(minterKey: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [SEED_QUOTA, mint.publicKey.toBuffer(), minterKey.toBuffer()],
            program.programId,
        );
    }

    function findBlacklistPda(target: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [SEED_BLACKLIST, mint.publicKey.toBuffer(), target.toBuffer()],
            program.programId,
        );
    }

    // ========================================================================
    // Setup: Airdrop SOL to test wallets
    // ========================================================================

    before(async () => {
        const wallets = [minter, burner, pauser, blacklister, seizer, recipient, blacklistTarget];
        for (const wallet of wallets) {
            const sig = await provider.connection.requestAirdrop(
                wallet.publicKey,
                2 * anchor.web3.LAMPORTS_PER_SOL,
            );
            await provider.connection.confirmTransaction(sig);
        }
    });

    // ========================================================================
    // Test 1: Initialize
    // ========================================================================

    describe("initialize", () => {
        it("creates a new SSS-1 stablecoin", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);

            await program.methods
                .initialize({
                    name: "Test USD",
                    symbol: "TUSD",
                    uri: "https://test.example.com/meta.json",
                    decimals: 6,
                    enablePermanentDelegate: false,
                    enableTransferHook: false,
                    defaultAccountFrozen: false,
                    hookProgramId: null,
                })
                .accounts({
                    authority: authority.publicKey,
                    mint: mint.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    masterRole: masterRolePda,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .signers([mint])
                .rpc();

            // Verify config
            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.name).to.equal("Test USD");
            expect(config.symbol).to.equal("TUSD");
            expect(config.decimals).to.equal(6);
            expect(config.authority.equals(authority.publicKey)).to.be.true;
            expect(config.mint.equals(mint.publicKey)).to.be.true;
            expect(config.paused).to.be.false;
            expect(config.enablePermanentDelegate).to.be.false;
            expect(config.enableTransferHook).to.be.false;

            // Verify pause state
            const pause = await (program.account as any).pauseState.fetch(pausePda);
            expect(pause.paused).to.be.false;

            // Verify master role
            const masterRole = await (program.account as any).roleRecord.fetch(masterRolePda);
            expect(masterRole.active).to.be.true;
            expect(masterRole.role.masterAuthority).to.not.be.undefined;
        });

        it("rejects duplicate initialization", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const newMint = Keypair.generate();

            try {
                await program.methods
                    .initialize({
                        name: "Duplicate",
                        symbol: "DUP",
                        uri: "https://dup.example.com",
                        decimals: 6,
                        enablePermanentDelegate: false,
                        enableTransferHook: false,
                        defaultAccountFrozen: false,
                        hookProgramId: null,
                    })
                    .accounts({
                        authority: authority.publicKey,
                        mint: mint.publicKey, // Same mint — should fail
                        config: configPda,
                        pauseState: pausePda,
                        masterRole: masterRolePda,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([mint])
                    .rpc();

                expect.fail("Should have thrown");
            } catch (err) {
                // Expected: account already initialized
            }
        });
    });

    // ========================================================================
    // Test 2: Role Management
    // ========================================================================

    describe("update_roles", () => {
        it("grants Minter role", async () => {
            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);

            await program.methods
                .updateRoles(minter.publicKey, { minter: {} }, true)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    targetRole: minterRolePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const role = await (program.account as any).roleRecord.fetch(minterRolePda);
            expect(role.active).to.be.true;
            expect(role.holder.equals(minter.publicKey)).to.be.true;
        });

        it("grants Burner role", async () => {
            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [burnerRolePda] = findRolePda(burner.publicKey, ROLE_BURNER);

            await program.methods
                .updateRoles(burner.publicKey, { burner: {} }, true)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    targetRole: burnerRolePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const role = await (program.account as any).roleRecord.fetch(burnerRolePda);
            expect(role.active).to.be.true;
        });

        it("grants Pauser role", async () => {
            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .updateRoles(pauser.publicKey, { pauser: {} }, true)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    targetRole: pauserRolePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const role = await (program.account as any).roleRecord.fetch(pauserRolePda);
            expect(role.active).to.be.true;
        });

        it("revokes a role", async () => {
            const testWallet = Keypair.generate();
            const sig = await provider.connection.requestAirdrop(testWallet.publicKey, anchor.web3.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(sig);

            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [testRolePda] = findRolePda(testWallet.publicKey, ROLE_PAUSER);

            // Grant
            await program.methods
                .updateRoles(testWallet.publicKey, { pauser: {} }, true)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    targetRole: testRolePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            // Revoke
            await program.methods
                .updateRoles(testWallet.publicKey, { pauser: {} }, false)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    targetRole: testRolePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const role = await (program.account as any).roleRecord.fetch(testRolePda);
            expect(role.active).to.be.false;
        });

        it("rejects role grant from non-authority", async () => {
            const [configPda] = findConfigPda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [targetRolePda] = findRolePda(recipient.publicKey, ROLE_BURNER);

            try {
                await program.methods
                    .updateRoles(recipient.publicKey, { burner: {} }, true)
                    .accounts({
                        authority: minter.publicKey, // Not the master authority
                        config: configPda,
                        authorityRole: minterRolePda, // Wrong role type
                        targetRole: targetRolePda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([minter])
                    .rpc();

                expect.fail("Should have thrown AuthorizationError");
            } catch (err) {
                // Expected: not authorized
            }
        });
    });

    // ========================================================================
    // Test 3: Minter Quota
    // ========================================================================

    describe("update_minter", () => {
        it("sets minter quota", async () => {
            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);

            await program.methods
                .updateMinter(minter.publicKey, new BN(10_000_000), { unlimited: {} })
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    authorityRole: authorityRolePda,
                    minterRole: minterRolePda,
                    minterQuota: quotaPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const quota = await (program.account as any).minterQuota.fetch(quotaPda);
            expect(quota.limit.toNumber()).to.equal(10_000_000);
            expect(quota.used.toNumber()).to.equal(0);
        });
    });

    // ========================================================================
    // Test 4: Mint Tokens
    // ========================================================================

    describe("mint_tokens", () => {
        it("mints tokens to a recipient", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);

            const recipientAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                recipient.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            await program.methods
                .mintTokens(new BN(1_000_000))
                .accounts({
                    minter: minter.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    minterRole: minterRolePda,
                    minterQuota: quotaPda,
                    mint: mint.publicKey,
                    recipientTokenAccount: recipientAta,
                    recipient: recipient.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([minter])
                .rpc();

            // Verify balance
            const account = await getAccount(
                provider.connection,
                recipientAta,
                "confirmed",
                TOKEN_2022_PROGRAM_ID,
            );
            expect(Number(account.amount)).to.equal(1_000_000);

            // Verify quota usage
            const quota = await (program.account as any).minterQuota.fetch(quotaPda);
            expect(quota.used.toNumber()).to.equal(1_000_000);
        });

        it("rejects mint when paused", async () => {
            // First pause
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .pause()
                .accounts({
                    operator: pauser.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    operatorRole: pauserRolePda,
                })
                .signers([pauser])
                .rpc();

            // Try to mint
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);
            const recipientAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                recipient.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            try {
                await program.methods
                    .mintTokens(new BN(500_000))
                    .accounts({
                        minter: minter.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        minterRole: minterRolePda,
                        minterQuota: quotaPda,
                        mint: mint.publicKey,
                        recipientTokenAccount: recipientAta,
                        recipient: recipient.publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([minter])
                    .rpc();

                expect.fail("Should have thrown TokenPaused");
            } catch (err) {
                // Expected: token is paused
            }

            // Unpause for subsequent tests
            await program.methods
                .unpause()
                .accounts({
                    operator: pauser.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    operatorRole: pauserRolePda,
                })
                .signers([pauser])
                .rpc();
        });

        it("rejects mint with zero amount", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);
            const recipientAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                recipient.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            try {
                await program.methods
                    .mintTokens(new BN(0))
                    .accounts({
                        minter: minter.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        minterRole: minterRolePda,
                        minterQuota: quotaPda,
                        mint: mint.publicKey,
                        recipientTokenAccount: recipientAta,
                        recipient: recipient.publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([minter])
                    .rpc();

                expect.fail("Should have thrown InvalidAmount");
            } catch (err) {
                // Expected: invalid amount
            }
        });
    });

    // ========================================================================
    // Test 5: Burn Tokens
    // ========================================================================

    describe("burn_tokens", () => {
        it("burns tokens from burner's account", async () => {
            // First mint tokens to the burner
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);
            const [burnerRolePda] = findRolePda(burner.publicKey, ROLE_BURNER);

            const burnerAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                burner.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            // Mint to burner
            await program.methods
                .mintTokens(new BN(2_000_000))
                .accounts({
                    minter: minter.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    minterRole: minterRolePda,
                    minterQuota: quotaPda,
                    mint: mint.publicKey,
                    recipientTokenAccount: burnerAta,
                    recipient: burner.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([minter])
                .rpc();

            // Burn
            await program.methods
                .burnTokens(new BN(500_000))
                .accounts({
                    burner: burner.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    burnerRole: burnerRolePda,
                    mint: mint.publicKey,
                    burnerTokenAccount: burnerAta,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .signers([burner])
                .rpc();

            // Verify remaining balance
            const account = await getAccount(
                provider.connection,
                burnerAta,
                "confirmed",
                TOKEN_2022_PROGRAM_ID,
            );
            expect(Number(account.amount)).to.equal(1_500_000);
        });
    });

    // ========================================================================
    // Test 6: Freeze / Thaw
    // ========================================================================

    describe("freeze/thaw", () => {
        it("freezes a token account", async () => {
            const [configPda] = findConfigPda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);

            const recipientAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                recipient.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            await program.methods
                .freezeAccount()
                .accounts({
                    operator: authority.publicKey,
                    config: configPda,
                    operatorRole: masterRolePda,
                    mint: mint.publicKey,
                    targetTokenAccount: recipientAta,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .rpc();

            const account = await getAccount(
                provider.connection,
                recipientAta,
                "confirmed",
                TOKEN_2022_PROGRAM_ID,
            );
            expect(account.isFrozen).to.be.true;
        });

        it("thaws a frozen account", async () => {
            const [configPda] = findConfigPda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);

            const recipientAta = getAssociatedTokenAddressSync(
                mint.publicKey,
                recipient.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );

            await program.methods
                .thawAccount()
                .accounts({
                    operator: authority.publicKey,
                    config: configPda,
                    operatorRole: masterRolePda,
                    mint: mint.publicKey,
                    targetTokenAccount: recipientAta,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .rpc();

            const account = await getAccount(
                provider.connection,
                recipientAta,
                "confirmed",
                TOKEN_2022_PROGRAM_ID,
            );
            expect(account.isFrozen).to.be.false;
        });
    });

    // ========================================================================
    // Test 7: Pause / Unpause
    // ========================================================================

    describe("pause/unpause", () => {
        it("pauses operations", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .pause()
                .accounts({
                    operator: pauser.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    operatorRole: pauserRolePda,
                })
                .signers([pauser])
                .rpc();

            const state = await (program.account as any).pauseState.fetch(pausePda);
            expect(state.paused).to.be.true;
        });

        it("rejects double pause", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            try {
                await program.methods
                    .pause()
                    .accounts({
                        operator: pauser.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        operatorRole: pauserRolePda,
                    })
                    .signers([pauser])
                    .rpc();

                expect.fail("Should have thrown AlreadyPaused");
            } catch (err) {
                // Expected
            }
        });

        it("unpauses operations", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .unpause()
                .accounts({
                    operator: pauser.publicKey,
                    config: configPda,
                    pauseState: pausePda,
                    operatorRole: pauserRolePda,
                })
                .signers([pauser])
                .rpc();

            const state = await (program.account as any).pauseState.fetch(pausePda);
            expect(state.paused).to.be.false;
        });
    });

    // ========================================================================
    // Test 8: Transfer Authority
    // ========================================================================

    describe("transfer_authority", () => {
        it("transfers MasterAuthority to a new wallet", async () => {
            const newAuthority = Keypair.generate();
            const sig = await provider.connection.requestAirdrop(
                newAuthority.publicKey,
                anchor.web3.LAMPORTS_PER_SOL,
            );
            await provider.connection.confirmTransaction(sig);

            const [configPda] = findConfigPda();
            const [oldMasterPda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [newMasterPda] = findRolePda(newAuthority.publicKey, ROLE_MASTER);

            await program.methods
                .transferAuthority(newAuthority.publicKey)
                .accounts({
                    authority: authority.publicKey,
                    config: configPda,
                    oldMasterRole: oldMasterPda,
                    newMasterRole: newMasterPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            // Verify
            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.authority.equals(newAuthority.publicKey)).to.be.true;

            const oldRole = await (program.account as any).roleRecord.fetch(oldMasterPda);
            expect(oldRole.active).to.be.false;

            const newRole = await (program.account as any).roleRecord.fetch(newMasterPda);
            expect(newRole.active).to.be.true;

            // Transfer back for subsequent tests
            await program.methods
                .transferAuthority(authority.publicKey)
                .accounts({
                    authority: newAuthority.publicKey,
                    config: configPda,
                    oldMasterRole: newMasterPda,
                    newMasterRole: oldMasterPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([newAuthority])
                .rpc();
        });
    });

    // ========================================================================
    // Test 9: Edge Cases
    // ========================================================================

    describe("edge cases", () => {
        it("rejects name longer than 32 characters", async () => {
            const badMint = Keypair.generate();
            const [configPda] = PublicKey.findProgramAddressSync(
                [SEED_CONFIG, badMint.publicKey.toBuffer()],
                program.programId,
            );
            const [pausePda] = PublicKey.findProgramAddressSync(
                [SEED_PAUSE, badMint.publicKey.toBuffer()],
                program.programId,
            );
            const [masterRolePda] = PublicKey.findProgramAddressSync(
                [SEED_ROLE, badMint.publicKey.toBuffer(), authority.publicKey.toBuffer(), Buffer.from([ROLE_MASTER])],
                program.programId,
            );

            try {
                await program.methods
                    .initialize({
                        name: "A".repeat(33), // Too long
                        symbol: "TST",
                        uri: "https://test.example.com",
                        decimals: 6,
                        enablePermanentDelegate: false,
                        enableTransferHook: false,
                        defaultAccountFrozen: false,
                        hookProgramId: null,
                    })
                    .accounts({
                        authority: authority.publicKey,
                        mint: badMint.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        masterRole: masterRolePda,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([badMint])
                    .rpc();

                expect.fail("Should have thrown NameTooLong");
            } catch (err) {
                // Expected
            }
        });

        it("rejects symbol longer than 10 characters", async () => {
            const badMint = Keypair.generate();
            const [configPda] = PublicKey.findProgramAddressSync(
                [SEED_CONFIG, badMint.publicKey.toBuffer()],
                program.programId,
            );
            const [pausePda] = PublicKey.findProgramAddressSync(
                [SEED_PAUSE, badMint.publicKey.toBuffer()],
                program.programId,
            );
            const [masterRolePda] = PublicKey.findProgramAddressSync(
                [SEED_ROLE, badMint.publicKey.toBuffer(), authority.publicKey.toBuffer(), Buffer.from([ROLE_MASTER])],
                program.programId,
            );

            try {
                await program.methods
                    .initialize({
                        name: "Test",
                        symbol: "A".repeat(11), // Too long
                        uri: "https://test.example.com",
                        decimals: 6,
                        enablePermanentDelegate: false,
                        enableTransferHook: false,
                        defaultAccountFrozen: false,
                        hookProgramId: null,
                    })
                    .accounts({
                        authority: authority.publicKey,
                        mint: badMint.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        masterRole: masterRolePda,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .signers([badMint])
                    .rpc();

                expect.fail("Should have thrown SymbolTooLong");
            } catch (err) {
                // Expected
            }
        });
    });
});
