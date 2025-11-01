#!/usr/bin/env node

/**
 * Generate Entity Secret Ciphertext - Manual Encryption Method
 * Following Circle's official documentation
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import crypto from "crypto";
import forge from "node-forge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

async function generateCiphertextManually() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Generate Entity Secret Ciphertext (Manual Method)   ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  const apiKey = process.env.CIRCLE_API_KEY;
  
  if (!apiKey) {
    console.log(`${colors.red}✗ CIRCLE_API_KEY not found in .env${colors.reset}`);
    process.exit(1);
  }

  try {
    // Step 1: Generate new Entity Secret
    console.log(`${colors.yellow}Step 1: Generating new Entity Secret...${colors.reset}\n`);
    const newEntitySecret = crypto.randomBytes(32).toString('hex');
    
    console.log(`${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.magenta}║  ⚠️  NEW ENTITY SECRET - SAVE THIS NOW!               ║${colors.reset}`);
    console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`${colors.green}${newEntitySecret}${colors.reset}\n`);

    // Step 2: Get public key from Circle
    console.log(`${colors.yellow}Step 2: Fetching public key from Circle API...${colors.reset}\n`);
    
    const circleSdk = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
    });

    const publicKeyResponse = await circleSdk.getPublicKey({});
    
    if (!publicKeyResponse?.data?.publicKey) {
      throw new Error("Failed to get public key from Circle");
    }

    const publicKeyPem = publicKeyResponse.data.publicKey;
    console.log(`${colors.green}✓ Public key retrieved${colors.reset}\n`);

    // Step 3: Encrypt the Entity Secret
    console.log(`${colors.yellow}Step 3: Encrypting Entity Secret...${colors.reset}\n`);
    
    const entitySecretBytes = forge.util.hexToBytes(newEntitySecret);
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
    const encryptedData = publicKey.encrypt(entitySecretBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    const ciphertext = forge.util.encode64(encryptedData);

    console.log(`${colors.green}✓ Encryption complete${colors.reset}\n`);
    console.log(`${colors.magenta}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.magenta}║  CIPHERTEXT - PASTE INTO CIRCLE CONSOLE               ║${colors.reset}`);
    console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`${colors.cyan}${ciphertext}${colors.reset}\n`);

    // Instructions
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}WHAT TO DO NOW:${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`1. ${colors.green}Copy the CIPHERTEXT above${colors.reset}`);
    console.log(`2. ${colors.green}Go to Circle Console (should still be open)${colors.reset}`);
    console.log(`3. ${colors.green}Paste it into "New entity secret ciphertext" field${colors.reset}`);
    console.log(`4. ${colors.green}Click "Reset" button${colors.reset}`);
    console.log(`5. ${colors.green}Update .env with the Entity Secret (shown at top):${colors.reset}\n`);
    console.log(`   ${colors.cyan}CIRCLE_ENTITY_SECRET=${newEntitySecret}${colors.reset}\n`);
    console.log(`6. ${colors.green}Test it works:${colors.reset}`);
    console.log(`   ${colors.cyan}node contracts/scripts/test-circle-wallet.mjs${colors.reset}\n`);

    console.log(`${colors.red}⚠️  IMPORTANT REMINDERS:${colors.reset}`);
    console.log(`• Save the Entity Secret NOW - you won't see it again!`);
    console.log(`• The old Entity Secret will stop working after reset`);
    console.log(`• Update .env immediately after clicking Reset\n`);

  } catch (error) {
    console.log(`${colors.red}✗ Failed to generate ciphertext${colors.reset}`);
    console.error("\nError:", error.message);
    
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }

    if (error.message.includes("forge")) {
      console.log(`\n${colors.yellow}Need to install node-forge:${colors.reset}`);
      console.log(`cd contracts && npm install node-forge\n`);
    }
    
    process.exit(1);
  }
}

generateCiphertextManually();
