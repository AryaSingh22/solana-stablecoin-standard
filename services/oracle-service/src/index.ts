/**
 * @module oracle-service
 * @description Fastify HTTP service for SSS oracle price-gated minting.
 *
 * Endpoints:
 *   POST /oracle/configure — Set oracle config for a mint
 *   GET  /oracle/price     — Get current oracle price
 *   POST /oracle/mint      — Execute price-gated mint
 *   GET  /health           — Health check
 */

import Fastify from "fastify";
import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({ logger: true });
const PORT = parseInt(process.env.PORT || "3003", 10);
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Health check
app.get("/health", async () => {
    return { status: "ok", service: "oracle-service", timestamp: new Date().toISOString() };
});

// Configure oracle for a mint
app.post<{
    Body: {
        mint: string;
        feedAddress: string;
        maxPrice: number;
        minPrice: number;
        maxStalenessSeconds: number;
    };
}>("/oracle/configure", async (request, reply) => {
    const { mint, feedAddress, maxPrice, minPrice, maxStalenessSeconds } = request.body;

    if (!mint || !feedAddress) {
        return reply.status(400).send({ error: "mint and feedAddress are required" });
    }

    // In production, this would call the oracle_module program
    return {
        success: true,
        data: {
            mint,
            feedAddress,
            maxPrice,
            minPrice,
            maxStalenessSeconds,
            configuredAt: new Date().toISOString(),
        },
    };
});

// Get current oracle price
app.get<{
    Querystring: { mint: string };
}>("/oracle/price", async (request, reply) => {
    const { mint } = request.query;

    if (!mint) {
        return reply.status(400).send({ error: "mint query parameter is required" });
    }

    // In production, this would read the oracle feed account
    return {
        success: true,
        data: {
            mint,
            price: "1.0000",
            confidence: "0.0001",
            timestamp: new Date().toISOString(),
            source: "switchboard-v2",
        },
    };
});

// Execute price-gated mint
app.post<{
    Body: {
        mint: string;
        recipient: string;
        amount: string;
    };
}>("/oracle/mint", async (request, reply) => {
    const { mint, recipient, amount } = request.body;

    if (!mint || !recipient || !amount) {
        return reply.status(400).send({ error: "mint, recipient, and amount are required" });
    }

    // In production, this would:
    // 1. Read the oracle feed
    // 2. Validate price bounds
    // 3. Call oracle_gated_mint instruction
    return {
        success: true,
        data: {
            mint,
            recipient,
            amount,
            priceAtMint: "1.0000",
            signature: "simulated_signature",
            timestamp: new Date().toISOString(),
        },
    };
});

// Start server
const start = async () => {
    try {
        await app.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`Oracle service running on port ${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
