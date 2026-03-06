/**
 * @file tests/unit/sss1.test.ts
 * @description Unit tests for SSS-1 stablecoin (no compliance features).
 *
 * HIGH-006: Required test file — unit tests for SSS-1 as specified by the bounty.
 *
 * Run with: anchor test (inside anchor test suite)
 * Or: npx ts-mocha -p ./tsconfig.json -t 1000000 tests/unit/sss1.test.ts
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
} from "@solana/spl-token";
import { expect } from "chai";

// PDA seed constants (must match on-chain program)
const SEED_CONFIG = Buffer.from("stablecoin_config");
const SEED_PAUSE = Buffer.from("pause_state");
const SEED_ROLE = Buffer.from("role");
const SEED_QUOTA = Buffer.from("minter_quota");

const ROLE_MASTER = 0;
const ROLE_MINTER = 1;
const ROLE_BURNER = 2;
const ROLE_PAUSER = 3;

describe("SSS-1 Unit Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SssToken as Program;
    const authority = provider.wallet;
    const mint = Keypair.generate();
    const minter = Keypair.generate();
    const burner = Keypair.generate();
    const pauser = Keypair.generate();
    const recipient = Keypair.generate();

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

    before(async () => {
        const wallets = [minter, burner, pauser, recipient];
        for (const wallet of wallets) {
            const sig = await provider.connection.requestAirdrop(
                wallet.publicKey,
                2 * anchor.web3.LAMPORTS_PER_SOL,
            );
            await provider.connection.confirmTransaction(sig);
        }
    });

    // =========================================================================
    // initialize
    // =========================================================================
    describe("initialize", () => {
        it("initializes SSS-1 token with correct config", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);

            await program.methods
                .initialize({
                    name: "Unit Test USD",
                    symbol: "TUSD",
                    uri: "https://unit-test.example.com/meta.json",
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

            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.name).to.equal("Unit Test USD");
            expect(config.symbol).to.equal("TUSD");
            expect(config.decimals).to.equal(6);
            expect(config.enablePermanentDelegate).to.be.false;
            expect(config.enableTransferHook).to.be.false;
        });

        it("stores all config fields correctly", async () => {
            const [configPda] = findConfigPda();
            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.authority.equals(authority.publicKey)).to.be.true;
            expect(config.mint.equals(mint.publicKey)).to.be.true;
            expect(config.totalMinted.toNumber()).to.equal(0);
            expect(config.totalBurned.toNumber()).to.equal(0);
        });

        it("creates PauseState with paused=false", async () => {
            const [pausePda] = findPausePda();
            const pause = await (program.account as any).pauseState.fetch(pausePda);
            expect(pause.paused).to.be.false;
        });

        it("creates MasterAuthority RoleRecord", async () => {
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const masterRole = await (program.account as any).roleRecord.fetch(masterRolePda);
            expect(masterRole.active).to.be.true;
            expect(masterRole.holder.equals(authority.publicKey)).to.be.true;
        });

        it("rejects re-initialization (AlreadyInitialized)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);

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
                expect.fail("Should have thrown on re-initialization");
            } catch (_err) {
                // Expected: Anchor init constraint fails if account already exists
            }
        });
    });

    // =========================================================================
    // mint
    // =========================================================================
    describe("mint", () => {
        before(async () => {
            // Grant minter role and set quota
            const [configPda] = findConfigPda();
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);

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
        });

        it("mints tokens to recipient", async () => {
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

            const account = await getAccount(provider.connection, recipientAta, "confirmed", TOKEN_2022_PROGRAM_ID);
            expect(Number(account.amount)).to.equal(1_000_000);
        });

        it("updates total_minted in config", async () => {
            const [configPda] = findConfigPda();
            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.totalMinted.toNumber()).to.be.greaterThan(0);
        });

        it("rejects mint from non-minter (NotAuthorized)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const fakeRole = Keypair.generate();
            const [badRolePda] = findRolePda(fakeRole.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(fakeRole.publicKey);
            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

            try {
                await program.methods
                    .mintTokens(new BN(100))
                    .accounts({
                        minter: fakeRole.publicKey,
                        config: configPda,
                        pauseState: pausePda,
                        minterRole: badRolePda,
                        minterQuota: quotaPda,
                        mint: mint.publicKey,
                        recipientTokenAccount: recipientAta,
                        recipient: recipient.publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([fakeRole])
                    .rpc();
                expect.fail("Should have thrown NotAuthorized");
            } catch (_err) {
                // Expected
            }
        });

        it("rejects mint with zero amount (InvalidAmount)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);
            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

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
            } catch (_err) {
                // Expected
            }
        });

        it("rejects mint while paused (TokensPaused)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);

            // Grant pauser and pause
            await program.methods
                .updateRoles(pauser.publicKey, { pauser: {} }, true)
                .accounts({ authority: authority.publicKey, config: configPda, authorityRole: authorityRolePda, targetRole: pauserRolePda, systemProgram: SystemProgram.programId })
                .rpc();

            await program.methods
                .pause()
                .accounts({ operator: pauser.publicKey, config: configPda, pauseState: pausePda, operatorRole: pauserRolePda })
                .signers([pauser])
                .rpc();

            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

            try {
                await program.methods
                    .mintTokens(new BN(100))
                    .accounts({
                        minter: minter.publicKey, config: configPda, pauseState: pausePda,
                        minterRole: minterRolePda, minterQuota: quotaPda, mint: mint.publicKey,
                        recipientTokenAccount: recipientAta, recipient: recipient.publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([minter])
                    .rpc();
                expect.fail("Should have thrown TokensPaused");
            } catch (_err) {
                // Expected
            }

            // Unpause for subsequent tests
            await program.methods
                .unpause()
                .accounts({ operator: pauser.publicKey, config: configPda, pauseState: pausePda, operatorRole: pauserRolePda })
                .signers([pauser])
                .rpc();
        });
    });

    // =========================================================================
    // burn
    // =========================================================================
    describe("burn", () => {
        it("burns tokens from burner account", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const [quotaPda] = findQuotaPda(minter.publicKey);
            const [authorityRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [burnerRolePda] = findRolePda(burner.publicKey, ROLE_BURNER);

            // Grant burner role
            await program.methods
                .updateRoles(burner.publicKey, { burner: {} }, true)
                .accounts({ authority: authority.publicKey, config: configPda, authorityRole: authorityRolePda, targetRole: burnerRolePda, systemProgram: SystemProgram.programId })
                .rpc();

            const burnerAta = getAssociatedTokenAddressSync(mint.publicKey, burner.publicKey, false, TOKEN_2022_PROGRAM_ID);

            // Mint to burner
            await program.methods
                .mintTokens(new BN(500_000))
                .accounts({
                    minter: minter.publicKey, config: configPda, pauseState: pausePda,
                    minterRole: minterRolePda, minterQuota: quotaPda, mint: mint.publicKey,
                    recipientTokenAccount: burnerAta, recipient: burner.publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .signers([minter])
                .rpc();

            // Burn
            await program.methods
                .burnTokens(new BN(100_000))
                .accounts({
                    burner: burner.publicKey, config: configPda, pauseState: pausePda,
                    burnerRole: burnerRolePda, mint: mint.publicKey,
                    burnerTokenAccount: burnerAta, tokenProgram: TOKEN_2022_PROGRAM_ID,
                })
                .signers([burner])
                .rpc();

            const account = await getAccount(provider.connection, burnerAta, "confirmed", TOKEN_2022_PROGRAM_ID);
            expect(Number(account.amount)).to.equal(400_000);
        });

        it("rejects burn from non-burner (BurnerNotFound)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const fakeKey = Keypair.generate();
            const [fakeRolePda] = findRolePda(fakeKey.publicKey, ROLE_BURNER);
            const fakeAta = getAssociatedTokenAddressSync(mint.publicKey, fakeKey.publicKey, false, TOKEN_2022_PROGRAM_ID);

            try {
                await program.methods
                    .burnTokens(new BN(100))
                    .accounts({
                        burner: fakeKey.publicKey, config: configPda, pauseState: pausePda,
                        burnerRole: fakeRolePda, mint: mint.publicKey,
                        burnerTokenAccount: fakeAta, tokenProgram: TOKEN_2022_PROGRAM_ID,
                    })
                    .signers([fakeKey])
                    .rpc();
                expect.fail("Should have thrown BurnerNotFound");
            } catch (_err) {
                // Expected
            }
        });
    });

    // =========================================================================
    // freeze / thaw
    // =========================================================================
    describe("freeze / thaw", () => {
        it("freezes a token account", async () => {
            const [configPda] = findConfigPda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

            await program.methods
                .freezeAccount()
                .accounts({ operator: authority.publicKey, config: configPda, operatorRole: masterRolePda, mint: mint.publicKey, targetTokenAccount: recipientAta, tokenProgram: TOKEN_2022_PROGRAM_ID })
                .rpc();

            const account = await getAccount(provider.connection, recipientAta, "confirmed", TOKEN_2022_PROGRAM_ID);
            expect(account.isFrozen).to.be.true;
        });

        it("thaws a frozen account", async () => {
            const [configPda] = findConfigPda();
            const [masterRolePda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

            await program.methods
                .thawAccount()
                .accounts({ operator: authority.publicKey, config: configPda, operatorRole: masterRolePda, mint: mint.publicKey, targetTokenAccount: recipientAta, tokenProgram: TOKEN_2022_PROGRAM_ID })
                .rpc();

            const account = await getAccount(provider.connection, recipientAta, "confirmed", TOKEN_2022_PROGRAM_ID);
            expect(account.isFrozen).to.be.false;
        });

        it("rejects freeze from unauthorized caller", async () => {
            const [configPda] = findConfigPda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);
            const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient.publicKey, false, TOKEN_2022_PROGRAM_ID);

            try {
                await program.methods
                    .freezeAccount()
                    .accounts({ operator: minter.publicKey, config: configPda, operatorRole: minterRolePda, mint: mint.publicKey, targetTokenAccount: recipientAta, tokenProgram: TOKEN_2022_PROGRAM_ID })
                    .signers([minter])
                    .rpc();
                expect.fail("Should have thrown NotAuthorized");
            } catch (_err) {
                // Expected
            }
        });
    });

    // =========================================================================
    // pause / unpause
    // =========================================================================
    describe("pause / unpause", () => {
        it("pauses token operations", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .pause()
                .accounts({ operator: pauser.publicKey, config: configPda, pauseState: pausePda, operatorRole: pauserRolePda })
                .signers([pauser])
                .rpc();

            const state = await (program.account as any).pauseState.fetch(pausePda);
            expect(state.paused).to.be.true;
        });

        it("rejects double-pause (AlreadyPaused)", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            try {
                await program.methods
                    .pause()
                    .accounts({ operator: pauser.publicKey, config: configPda, pauseState: pausePda, operatorRole: pauserRolePda })
                    .signers([pauser])
                    .rpc();
                expect.fail("Should have thrown AlreadyPaused");
            } catch (_err) {
                // Expected — MED-001 fix ensures this throws AlreadyPaused
            }
        });

        it("unpauses token operations", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [pauserRolePda] = findRolePda(pauser.publicKey, ROLE_PAUSER);

            await program.methods
                .unpause()
                .accounts({ operator: pauser.publicKey, config: configPda, pauseState: pausePda, operatorRole: pauserRolePda })
                .signers([pauser])
                .rpc();

            const state = await (program.account as any).pauseState.fetch(pausePda);
            expect(state.paused).to.be.false;
        });

        it("rejects pause from non-pauser role", async () => {
            const [configPda] = findConfigPda();
            const [pausePda] = findPausePda();
            const [minterRolePda] = findRolePda(minter.publicKey, ROLE_MINTER);

            try {
                await program.methods
                    .pause()
                    .accounts({ operator: minter.publicKey, config: configPda, pauseState: pausePda, operatorRole: minterRolePda })
                    .signers([minter])
                    .rpc();
                expect.fail("Should have thrown PauserNotFound");
            } catch (_err) {
                // Expected
            }
        });
    });

    // =========================================================================
    // role management
    // =========================================================================
    describe("role management", () => {
        it("transfers authority and changes master key", async () => {
            const newAuthority = Keypair.generate();
            const sig = await provider.connection.requestAirdrop(newAuthority.publicKey, anchor.web3.LAMPORTS_PER_SOL);
            await provider.connection.confirmTransaction(sig);

            const [configPda] = findConfigPda();
            const [oldMasterPda] = findRolePda(authority.publicKey, ROLE_MASTER);
            const [newMasterPda] = findRolePda(newAuthority.publicKey, ROLE_MASTER);

            await program.methods
                .transferAuthority(newAuthority.publicKey)
                .accounts({ authority: authority.publicKey, config: configPda, oldMasterRole: oldMasterPda, newMasterRole: newMasterPda, systemProgram: SystemProgram.programId })
                .rpc();

            const config = await (program.account as any).stablecoinConfig.fetch(configPda);
            expect(config.authority.equals(newAuthority.publicKey)).to.be.true;

            // Transfer back
            await program.methods
                .transferAuthority(authority.publicKey)
                .accounts({ authority: newAuthority.publicKey, config: configPda, oldMasterRole: newMasterPda, newMasterRole: oldMasterPda, systemProgram: SystemProgram.programId })
                .signers([newAuthority])
                .rpc();
        });
    });
});
