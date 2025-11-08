#!/usr/bin/env node

/**
 * Circle Wallet Service - Standalone Node.js Server
 * Runs alongside Cloudflare Workers to handle wallet creation
 *
 * Why separate? Circle SDK requires Node.js crypto modules that don't work in Workers
 *
 * Usage:
 *   node wallet-service.mjs
 *
 * Endpoints:
 *   POST /create-wallet - Create new Circle wallet for Arc blockchain
 *   GET /wallet/:id - Get wallet details
 *   GET /health - Health check
 */

import "dotenv/config";
import { createServer } from "http";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const PORT = process.env.WALLET_SERVICE_PORT || 3001;
const API_SECRET =
  process.env.WALLET_SERVICE_SECRET || "dev-secret-change-in-production";

console.log("🔐 Wallet Service Configuration:");
console.log("   API Secret configured:", API_SECRET ? "Yes" : "No");
console.log("   Secret value:", API_SECRET.substring(0, 10) + "...");

// Initialize Circle SDK
const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

console.log("✓ Circle SDK initialized");

/**
 * Create wallet set
 */
async function createWalletSet(name) {
  const response = await circleClient.createWalletSet({
    name: name,
  });

  if (!response.data?.walletSet?.id) {
    throw new Error("Wallet set creation failed");
  }

  console.log(`✓ Wallet set created: ${response.data.walletSet.id}`);
  return response.data.walletSet.id;
}

/**
 * Create wallet
 */
async function createWallet(userId) {
  try {
    console.log(`Creating wallet for user: ${userId}`);

    // Create wallet set
    const walletSetName = `gigstream-${userId}-${Date.now()}`;
    const walletSetId = await createWalletSet(walletSetName);

    // Create wallet in the set
    // Use MATIC-AMOY (EVM testnet) - address works on Arc blockchain
    const response = await circleClient.createWallets({
      accountType: "EOA",
      blockchains: ["MATIC-AMOY"],
      count: 1,
      walletSetId: walletSetId,
    });

    if (!response.data?.wallets || response.data.wallets.length === 0) {
      throw new Error("Wallet creation failed - no wallets returned");
    }

    const wallet = response.data.wallets[0];

    // Poll for address if pending
    let address = wallet.address || "";
    if (!address || wallet.state === "PENDING") {
      console.log("⏳ Waiting for wallet address...");

      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await circleClient.getWallet({ id: wallet.id });
        if (statusResponse.data?.wallet?.address) {
          address = statusResponse.data.wallet.address;
          break;
        }
      }
    }

    console.log(`✓ Wallet created: ${wallet.id}`);
    console.log(`  Address: ${address || "pending"}`);

    return {
      walletId: wallet.id,
      address: address || "pending",
      state: wallet.state,
      blockchain: "MATIC-AMOY",
      arcCompatible: true,
    };
  } catch (error) {
    console.error("✗ Wallet creation failed:", error.message);
    throw error;
  }
}

/**
 * Get wallet details
 */
async function getWallet(walletId) {
  const response = await circleClient.getWallet({ id: walletId });

  if (!response.data?.wallet) {
    throw new Error("Wallet not found");
  }

  const wallet = response.data.wallet;

  return {
    walletId: wallet.id,
    address: wallet.address,
    state: wallet.state,
    blockchain: wallet.blockchain,
  };
}

/**
 * HTTP Request Handler
 */
const server = createServer(async (req, res) => {
  // Enable CORS for localhost
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Secret");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Check API secret
  const providedSecret = req.headers["x-api-secret"];
  if (providedSecret !== API_SECRET) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ status: "ok", service: "circle-wallet-service" })
      );
      return;
    }

    // Create wallet
    if (url.pathname === "/create-wallet" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const { userId } = JSON.parse(body);

          if (!userId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "userId required" }));
            return;
          }

          const wallet = await createWallet(userId);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, data: wallet }));
        } catch (error) {
          console.error("Wallet creation error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: error.message,
            })
          );
        }
      });
      return;
    }

    // Get wallet
    if (url.pathname.startsWith("/wallet/") && req.method === "GET") {
      const walletId = url.pathname.split("/")[2];

      const wallet = await getWallet(walletId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: wallet }));
      return;
    }

    // Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("Request error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("🚀 Circle Wallet Service Started");
  console.log("========================================");
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log("   Endpoints:");
  console.log(`     POST /create-wallet`);
  console.log(`     GET  /wallet/:id`);
  console.log("");
  console.log("   Use X-API-Secret header for authentication");
  console.log("========================================");
  console.log("");
});
