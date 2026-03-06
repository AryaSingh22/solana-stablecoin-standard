/**
 * @module tests/errors
 * @description Unit tests for error classes and error parsing.
 */

import { describe, it, expect } from "vitest";
import {
    SSSError,
    TransactionError,
    AuthorizationError,
    TokenPausedError,
    FeatureNotEnabledError,
    BlacklistedError,
    QuotaExceededError,
    ConfigError,
    AccountNotFoundError,
    parseError,
} from "../src/errors";

describe("Error Classes", () => {
    describe("SSSError", () => {
        it("is an instance of Error", () => {
            const err = new SSSError("test");
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(SSSError);
            expect(err.name).toBe("SSSError");
        });

        it("preserves error code", () => {
            const err = new SSSError("test", 6000);
            expect(err.code).toBe(6000);
        });

        it("preserves cause", () => {
            const cause = new Error("original");
            const err = new SSSError("wrapped", undefined, cause);
            expect(err.cause).toBe(cause);
        });
    });

    describe("TransactionError", () => {
        it("is an instance of SSSError", () => {
            const err = new TransactionError("tx failed", 6000, "sig123", [
                "log1",
                "log2",
            ]);
            expect(err).toBeInstanceOf(SSSError);
            expect(err.name).toBe("TransactionError");
            expect(err.signature).toBe("sig123");
            expect(err.logs).toEqual(["log1", "log2"]);
        });
    });

    describe("AuthorizationError", () => {
        it("has the correct name", () => {
            const err = new AuthorizationError("not allowed");
            expect(err.name).toBe("AuthorizationError");
        });
    });

    describe("TokenPausedError", () => {
        it("has a default message", () => {
            const err = new TokenPausedError();
            expect(err.message).toContain("paused");
            expect(err.name).toBe("TokenPausedError");
        });
    });

    describe("FeatureNotEnabledError", () => {
        it("includes the feature name", () => {
            const err = new FeatureNotEnabledError("blacklist");
            expect(err.message).toContain("blacklist");
            expect(err.name).toBe("FeatureNotEnabledError");
        });
    });

    describe("BlacklistedError", () => {
        it("includes the address", () => {
            const err = new BlacklistedError("ABC123");
            expect(err.message).toContain("ABC123");
            expect(err.name).toBe("BlacklistedError");
        });
    });

    describe("QuotaExceededError", () => {
        it("includes limit, used, and attempted amounts", () => {
            const err = new QuotaExceededError(1000n, 900n, 200n);
            expect(err.limit).toBe(1000n);
            expect(err.used).toBe(900n);
            expect(err.attempted).toBe(200n);
            expect(err.name).toBe("QuotaExceededError");
        });
    });

    describe("ConfigError", () => {
        it("has the correct name", () => {
            const err = new ConfigError("invalid rpc");
            expect(err.name).toBe("ConfigError");
        });
    });

    describe("AccountNotFoundError", () => {
        it("includes account type and address", () => {
            const err = new AccountNotFoundError("StablecoinConfig", "ABC123");
            expect(err.message).toContain("StablecoinConfig");
            expect(err.message).toContain("ABC123");
        });
    });
});

describe("parseError", () => {
    it("returns SSSError instances unchanged", () => {
        const original = new TokenPausedError();
        const parsed = parseError(original);
        expect(parsed).toBe(original);
    });

    it("maps known error codes", () => {
        const error = { code: 6000, message: "Custom" };
        const parsed = parseError(error);
        expect(parsed).toBeInstanceOf(AuthorizationError);
    });

    it("maps nested error codes", () => {
        const error = { error: { code: 6001 }, message: "Paused" };
        const parsed = parseError(error);
        expect(parsed).toBeInstanceOf(TokenPausedError);
    });

    it("wraps unknown errors as SSSError", () => {
        const error = { message: "something went wrong" };
        const parsed = parseError(error);
        expect(parsed).toBeInstanceOf(SSSError);
        expect(parsed.message).toBe("something went wrong");
    });

    it("handles non-object errors", () => {
        const parsed = parseError("string error");
        expect(parsed).toBeInstanceOf(SSSError);
    });
});
