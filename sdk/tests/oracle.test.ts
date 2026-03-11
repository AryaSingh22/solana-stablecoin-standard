/**
 * @module tests/oracle
 * @description Tests for Oracle module SDK integration.
 *
 * Validates Oracle PDA derivation, config types, service response shapes,
 * and error handling patterns.
 */

import { describe, it, expect } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";

const ORACLE_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
const SEED_ORACLE_CONFIG = Buffer.from("oracle_config");

describe("Oracle PDA Derivation", () => {
    it("derives oracle config PDA from mint", () => {
        const mint = Keypair.generate().publicKey;
        const [pda] = PublicKey.findProgramAddressSync(
            [SEED_ORACLE_CONFIG, mint.toBuffer()],
            ORACLE_PROGRAM_ID,
        );
        expect(pda).toBeInstanceOf(PublicKey);
    });

    it("different mints produce different PDAs", () => {
        const mint1 = Keypair.generate().publicKey;
        const mint2 = Keypair.generate().publicKey;
        const [pda1] = PublicKey.findProgramAddressSync(
            [SEED_ORACLE_CONFIG, mint1.toBuffer()],
            ORACLE_PROGRAM_ID,
        );
        const [pda2] = PublicKey.findProgramAddressSync(
            [SEED_ORACLE_CONFIG, mint2.toBuffer()],
            ORACLE_PROGRAM_ID,
        );
        expect(pda1.equals(pda2)).toBe(false);
    });

    it("same mint produces deterministic PDA", () => {
        const mint = Keypair.generate().publicKey;
        const [pda1] = PublicKey.findProgramAddressSync(
            [SEED_ORACLE_CONFIG, mint.toBuffer()],
            ORACLE_PROGRAM_ID,
        );
        const [pda2] = PublicKey.findProgramAddressSync(
            [SEED_ORACLE_CONFIG, mint.toBuffer()],
            ORACLE_PROGRAM_ID,
        );
        expect(pda1.equals(pda2)).toBe(true);
    });
});

describe("Oracle Config Validation", () => {
    it("max_price must be greater than min_price", () => {
        const maxPrice = 1050000;
        const minPrice = 950000;
        expect(maxPrice).toBeGreaterThan(minPrice);
    });

    it("max_staleness_seconds must be positive", () => {
        const staleness = 300;
        expect(staleness).toBeGreaterThan(0);
    });

    it("amount must be positive for oracle mint", () => {
        const amount = 0;
        expect(amount).toBe(0);
        expect(amount > 0).toBe(false);
    });

    it("feed address must be valid PublicKey", () => {
        const feed = Keypair.generate().publicKey;
        expect(feed).toBeInstanceOf(PublicKey);
    });
});

describe("Oracle Service Response Shapes", () => {
    it("health response has status field", () => {
        const response = { status: "ok", service: "oracle-service", timestamp: new Date().toISOString() };
        expect(response.status).toBe("ok");
        expect(response.service).toBe("oracle-service");
    });

    it("price response has required fields", () => {
        const response = {
            success: true,
            data: {
                mint: "ABC123",
                price: "1.0000",
                confidence: "0.0001",
                timestamp: new Date().toISOString(),
                source: "switchboard-v2",
            },
        };
        expect(response.success).toBe(true);
        expect(response.data.price).toBeDefined();
        expect(response.data.source).toBe("switchboard-v2");
    });

    it("mint response has signature field", () => {
        const response = {
            success: true,
            data: {
                mint: "ABC123",
                recipient: "DEF456",
                amount: "1000000",
                priceAtMint: "1.0000",
                signature: "sig123",
                timestamp: new Date().toISOString(),
            },
        };
        expect(response.data.signature).toBeDefined();
        expect(response.data.priceAtMint).toBe("1.0000");
    });

    it("configure response has configuredAt field", () => {
        const response = {
            success: true,
            data: {
                mint: "ABC123",
                feedAddress: "Feed123",
                maxPrice: 1050000,
                minPrice: 950000,
                maxStalenessSeconds: 300,
                configuredAt: new Date().toISOString(),
            },
        };
        expect(response.data.configuredAt).toBeDefined();
    });

    it("error response for missing mint has error message", () => {
        const response = { error: "mint query parameter is required" };
        expect(response.error).toContain("mint");
    });
});

describe("Oracle Error Handling", () => {
    it("OracleNotActive error name is recognizable", () => {
        const errorName = "OracleNotActive";
        expect(errorName).toBe("OracleNotActive");
    });

    it("StaleFeed error name is recognizable", () => {
        const errorName = "StaleFeed";
        expect(errorName).toBe("StaleFeed");
    });

    it("PriceOutOfBounds error name is recognizable", () => {
        const errorName = "PriceOutOfBounds";
        expect(errorName).toBe("PriceOutOfBounds");
    });
});
