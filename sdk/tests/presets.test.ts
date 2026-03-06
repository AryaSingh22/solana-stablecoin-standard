/**
 * @module tests/presets
 * @description Unit tests for SSS presets.
 */

import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { sss1Preset, SSS1_FEATURES } from "../src/presets/sss1";
import { sss2Preset, SSS2_FEATURES } from "../src/presets/sss2";

describe("SSS-1 Preset", () => {
    it("creates args with compliance features disabled", () => {
        const args = sss1Preset("USD Stablecoin", "USDS", "https://meta.example.com");
        expect(args.name).toBe("USD Stablecoin");
        expect(args.symbol).toBe("USDS");
        expect(args.uri).toBe("https://meta.example.com");
        expect(args.decimals).toBe(6);
        expect(args.enablePermanentDelegate).toBe(false);
        expect(args.enableTransferHook).toBe(false);
        expect(args.defaultAccountFrozen).toBe(false);
        expect(args.hookProgramId).toBeUndefined();
    });

    it("allows custom decimals", () => {
        const args = sss1Preset("Test", "TST", "https://test.com", 9);
        expect(args.decimals).toBe(9);
    });

    it("SSS1_FEATURES has correct flags", () => {
        expect(SSS1_FEATURES.mint).toBe(true);
        expect(SSS1_FEATURES.burn).toBe(true);
        expect(SSS1_FEATURES.freeze).toBe(true);
        expect(SSS1_FEATURES.pause).toBe(true);
        expect(SSS1_FEATURES.roles).toBe(true);
        expect(SSS1_FEATURES.blacklist).toBe(false);
        expect(SSS1_FEATURES.seize).toBe(false);
        expect(SSS1_FEATURES.transferHook).toBe(false);
        expect(SSS1_FEATURES.permanentDelegate).toBe(false);
    });
});

describe("SSS-2 Preset", () => {
    const hookProgram = new PublicKey(
        "Hook111111111111111111111111111111111111111",
    );

    it("creates args with all compliance features enabled", () => {
        const args = sss2Preset(
            "Regulated USD",
            "RUSD",
            "https://regulated.example.com",
            hookProgram,
        );
        expect(args.name).toBe("Regulated USD");
        expect(args.symbol).toBe("RUSD");
        expect(args.uri).toBe("https://regulated.example.com");
        expect(args.decimals).toBe(6);
        expect(args.enablePermanentDelegate).toBe(true);
        expect(args.enableTransferHook).toBe(true);
        expect(args.defaultAccountFrozen).toBe(true);
        expect(args.hookProgramId?.equals(hookProgram)).toBe(true);
    });

    it("allows custom decimals", () => {
        const args = sss2Preset("Test", "TST", "https://test.com", hookProgram, 2);
        expect(args.decimals).toBe(2);
    });

    it("SSS2_FEATURES has all flags enabled", () => {
        expect(SSS2_FEATURES.mint).toBe(true);
        expect(SSS2_FEATURES.burn).toBe(true);
        expect(SSS2_FEATURES.freeze).toBe(true);
        expect(SSS2_FEATURES.pause).toBe(true);
        expect(SSS2_FEATURES.roles).toBe(true);
        expect(SSS2_FEATURES.blacklist).toBe(true);
        expect(SSS2_FEATURES.seize).toBe(true);
        expect(SSS2_FEATURES.transferHook).toBe(true);
        expect(SSS2_FEATURES.permanentDelegate).toBe(true);
    });
});
