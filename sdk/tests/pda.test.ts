/**
 * @module tests/pda
 * @description Unit tests for PDA derivation helpers.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
    findConfigPda,
    findPauseStatePda,
    findRolePda,
    findQuotaPda,
    findBlacklistPda,
    findExtraAccountMetaListPda,
} from "../src/pda";
import { RoleType } from "../src/types";

const PROGRAM_ID = new PublicKey(
    "SSSToken11111111111111111111111111111111111",
);
const HOOK_PROGRAM_ID = new PublicKey(
    "Hook111111111111111111111111111111111111111",
);
const MINT = new PublicKey("So11111111111111111111111111111111111111112");
const HOLDER = new PublicKey("11111111111111111111111111111111");

describe("PDA Derivation", () => {
    describe("findConfigPda", () => {
        it("returns a valid PDA and bump", () => {
            const [pda, bump] = findConfigPda(MINT, PROGRAM_ID);
            expect(pda).toBeInstanceOf(PublicKey);
            expect(bump).toBeGreaterThanOrEqual(0);
            expect(bump).toBeLessThanOrEqual(255);
        });

        it("returns deterministic results", () => {
            const [pda1] = findConfigPda(MINT, PROGRAM_ID);
            const [pda2] = findConfigPda(MINT, PROGRAM_ID);
            expect(pda1.equals(pda2)).toBe(true);
        });

        it("returns different PDAs for different mints", () => {
            const mint2 = new PublicKey(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            );
            const [pda1] = findConfigPda(MINT, PROGRAM_ID);
            const [pda2] = findConfigPda(mint2, PROGRAM_ID);
            expect(pda1.equals(pda2)).toBe(false);
        });
    });

    describe("findPauseStatePda", () => {
        it("returns a valid PDA", () => {
            const [pda, bump] = findPauseStatePda(MINT, PROGRAM_ID);
            expect(pda).toBeInstanceOf(PublicKey);
            expect(bump).toBeGreaterThanOrEqual(0);
        });

        it("returns a different PDA than config", () => {
            const [configPda] = findConfigPda(MINT, PROGRAM_ID);
            const [pausePda] = findPauseStatePda(MINT, PROGRAM_ID);
            expect(configPda.equals(pausePda)).toBe(false);
        });
    });

    describe("findRolePda", () => {
        it("returns different PDAs for different roles", () => {
            const [masterPda] = findRolePda(
                MINT,
                HOLDER,
                RoleType.MasterAuthority,
                PROGRAM_ID,
            );
            const [minterPda] = findRolePda(
                MINT,
                HOLDER,
                RoleType.Minter,
                PROGRAM_ID,
            );
            expect(masterPda.equals(minterPda)).toBe(false);
        });

        it("returns different PDAs for different holders", () => {
            const holder2 = new PublicKey(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            );
            const [pda1] = findRolePda(
                MINT,
                HOLDER,
                RoleType.MasterAuthority,
                PROGRAM_ID,
            );
            const [pda2] = findRolePda(
                MINT,
                holder2,
                RoleType.MasterAuthority,
                PROGRAM_ID,
            );
            expect(pda1.equals(pda2)).toBe(false);
        });

        it("covers all role types", () => {
            const roles = [
                RoleType.MasterAuthority,
                RoleType.Minter,
                RoleType.Burner,
                RoleType.Pauser,
                RoleType.Blacklister,
                RoleType.Seizer,
            ];
            const pdas = roles.map((r) => findRolePda(MINT, HOLDER, r, PROGRAM_ID));
            // All 6 PDAs should be unique
            const addresses = new Set(pdas.map(([pda]) => pda.toBase58()));
            expect(addresses.size).toBe(6);
        });
    });

    describe("findQuotaPda", () => {
        it("returns a valid PDA", () => {
            const [pda, bump] = findQuotaPda(MINT, HOLDER, PROGRAM_ID);
            expect(pda).toBeInstanceOf(PublicKey);
            expect(bump).toBeGreaterThanOrEqual(0);
        });
    });

    describe("findBlacklistPda", () => {
        it("returns a valid PDA", () => {
            const [pda, bump] = findBlacklistPda(MINT, HOLDER, PROGRAM_ID);
            expect(pda).toBeInstanceOf(PublicKey);
            expect(bump).toBeGreaterThanOrEqual(0);
        });

        it("returns different PDAs for different targets", () => {
            const target2 = new PublicKey(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            );
            const [pda1] = findBlacklistPda(MINT, HOLDER, PROGRAM_ID);
            const [pda2] = findBlacklistPda(MINT, target2, PROGRAM_ID);
            expect(pda1.equals(pda2)).toBe(false);
        });
    });

    describe("findExtraAccountMetaListPda", () => {
        it("returns a valid PDA", () => {
            const [pda, bump] = findExtraAccountMetaListPda(MINT, HOOK_PROGRAM_ID);
            expect(pda).toBeInstanceOf(PublicKey);
            expect(bump).toBeGreaterThanOrEqual(0);
        });
    });
});
