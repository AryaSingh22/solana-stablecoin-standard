import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

const SEED_CONFIG = Buffer.from("stablecoin_config");
const SEED_PAUSE = Buffer.from("pause_state");
const SEED_ROLE = Buffer.from("role");
const SEED_BLACKLIST = Buffer.from("blacklist");

const ROLE_MASTER = 0;

describe("Transfer Hook Execute - Dead Code Utilization Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const sssProgram = anchor.workspace.SssToken as Program;
    const hookProgram = anchor.workspace.TransferHook as Program;

    const authority = provider.wallet;

    // The "real" mint for the transfer
    const mint = Keypair.generate();

    // A secondary mint to create a valid pause state/blacklist that belongs to another token
    const fakeMint = Keypair.generate();

    // Token accounts
    const sourceAccount = Keypair.generate();
    const destinationAccount = Keypair.generate();

    function findConfigPda(m: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync([SEED_CONFIG, m.toBuffer()], sssProgram.programId);
    }
    function findPausePda(m: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync([SEED_PAUSE, m.toBuffer()], sssProgram.programId);
    }
    function findRolePda(m: PublicKey, holder: PublicKey, role: number): [PublicKey, number] {
        return PublicKey.findProgramAddressSync([SEED_ROLE, m.toBuffer(), holder.toBuffer(), Buffer.from([role])], sssProgram.programId);
    }
    function findBlacklistPda(m: PublicKey, target: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync([SEED_BLACKLIST, m.toBuffer(), target.toBuffer()], sssProgram.programId);
    }

    before(async () => {
        // Initialize the fake mint to populate its Pause PDA
        const [fakeConfigPda] = findConfigPda(fakeMint.publicKey);
        const [fakePausePda] = findPausePda(fakeMint.publicKey);
        const [fakeMasterRolePda] = findRolePda(fakeMint.publicKey, authority.publicKey, ROLE_MASTER);

        // Mints do not need airdrops because they are allocated via System Program create_account
        // Airdropping lamports beforehand causes "already in use" allocation errors.

        await sssProgram.methods
            .initialize({
                name: "Fake USD",
                symbol: "FUSD",
                uri: "https://example.com",
                decimals: 6,
                enablePermanentDelegate: false,
                enableTransferHook: false,
                defaultAccountFrozen: false,
                hookProgramId: null,
            })
            .accounts({
                authority: authority.publicKey,
                mint: fakeMint.publicKey,
                config: fakeConfigPda,
                pauseState: fakePausePda,
                masterRole: fakeMasterRolePda,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([fakeMint])
            .rpc();
    });

    it("rejects transfer when provided a PauseState belonging to a different mint", async () => {
        const [fakePausePda] = findPausePda(fakeMint.publicKey);
        const [fakeBlacklistPda] = findBlacklistPda(fakeMint.publicKey, authority.publicKey); // Non-existent, effectively empty data

        try {
            await hookProgram.methods
                .execute(new BN(100))
                .accounts({
                    sourceAccount: sourceAccount.publicKey,
                    mint: mint.publicKey,
                    destinationAccount: destinationAccount.publicKey,
                    owner: authority.publicKey,
                    extraAccountMetaList: PublicKey.default, // Dummy
                    pauseState: fakePausePda,       // Providing the OTHER mint's valid pause state!
                    sourceBlacklist: fakeBlacklistPda,
                    destBlacklist: fakeBlacklistPda,
                })
                .rpc();
            expect.fail("Should have failed validation due to mint mismatch");
        } catch (err: any) {
            expect(err.message).to.include("InvalidAccountData");
        }
    });
});
