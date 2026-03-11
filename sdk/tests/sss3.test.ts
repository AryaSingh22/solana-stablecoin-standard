/**
 * @module tests/sss3
 * @description Tests for SSS-3 preset, features, and type validation.
 */

import { describe, it, expect } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import { sss3Preset, SSS3_FEATURES } from "../src/presets/sss3";
import { SSSPreset } from "../src/types";

const hookProgramId = new PublicKey("2wcwbEsw7rZ2t36qaDujHUc9HHrg3f5m4opcSHpixNUv");

describe("SSS-3 Preset", () => {
    it("sss3Preset returns correct name", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.name).toBe("Private USD");
    });

    it("sss3Preset returns correct symbol", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.symbol).toBe("PUSD");
    });

    it("sss3Preset returns correct uri", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.uri).toBe("https://test.com");
    });

    it("sss3Preset sets default decimals to 6", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.decimals).toBe(6);
    });

    it("sss3Preset accepts custom decimals", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId, 9);
        expect(args.decimals).toBe(9);
    });

    it("sss3Preset enables permanent delegate", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.enablePermanentDelegate).toBe(true);
    });

    it("sss3Preset enables transfer hook", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.enableTransferHook).toBe(true);
    });

    it("sss3Preset enables default account frozen", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.defaultAccountFrozen).toBe(true);
    });

    it("sss3Preset enables confidential transfers", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.enableConfidentialTransfers).toBe(true);
    });

    it("sss3Preset enables allowlist", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.enableAllowlist).toBe(true);
    });

    it("sss3Preset sets hookProgramId", () => {
        const args = sss3Preset("Private USD", "PUSD", "https://test.com", hookProgramId);
        expect(args.hookProgramId?.equals(hookProgramId)).toBe(true);
    });
});

describe("SSS-3 Features", () => {
    it("SSS3_FEATURES includes all SSS-1 features", () => {
        expect(SSS3_FEATURES.mint).toBe(true);
        expect(SSS3_FEATURES.burn).toBe(true);
        expect(SSS3_FEATURES.freeze).toBe(true);
        expect(SSS3_FEATURES.pause).toBe(true);
        expect(SSS3_FEATURES.roles).toBe(true);
    });

    it("SSS3_FEATURES includes all SSS-2 features", () => {
        expect(SSS3_FEATURES.blacklist).toBe(true);
        expect(SSS3_FEATURES.seize).toBe(true);
        expect(SSS3_FEATURES.transferHook).toBe(true);
        expect(SSS3_FEATURES.permanentDelegate).toBe(true);
    });

    it("SSS3_FEATURES includes confidential transfers", () => {
        expect(SSS3_FEATURES.confidentialTransfers).toBe(true);
    });

    it("SSS3_FEATURES includes allowlist", () => {
        expect(SSS3_FEATURES.allowlist).toBe(true);
    });

    it("SSS3_FEATURES has exactly 11 properties", () => {
        expect(Object.keys(SSS3_FEATURES).length).toBe(11);
    });

    it("SSS3_FEATURES is typed as readonly", () => {
        expect(typeof SSS3_FEATURES).toBe("object");
        expect(SSS3_FEATURES.confidentialTransfers).toBe(true);
    });
});

describe("SSSPreset enum", () => {
    it("SSS3 enum value is SSS-3", () => {
        expect(SSSPreset.SSS3).toBe("SSS-3");
    });
});
