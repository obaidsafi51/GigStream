#!/usr/bin/env node

/**
 * Generate and Register Entity Secret for Circle API
 *
 * This script helps you:
 * 1. Generate a new Entity Secret
 * 2. Encrypt it to create ciphertext
 * 3. Register it with Circle
 *
 * Run: node contracts/scripts/register-entity-secret.mjs
 */

import {
  generateEntitySecret,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

async function registerEntitySecret() {
  console.log(
    `\n${colors.cyan}=== Circle Entity Secret Registration ===${colors.reset}\n`
  );

  const apiKey = process.env.CIRCLE_API_KEY;

  if (!apiKey) {
    logError("CIRCLE_API_KEY not found in .env");
    process.exit(1);
  }

  try {
    // Step 1: Generate Entity Secret
    logInfo("Step 1: Generating Entity Secret...");
    console.log("\nℹ️  The Entity Secret will be displayed below.");
    console.log(
      "⚠️  IMPORTANT: Save this value securely! You'll need it for all API calls.\n"
    );

    const secretOutput = generateEntitySecret();

    // Extract the entity secret from the output
    const entitySecret = secretOutput.match(
      /ENTITY SECRET: ([a-f0-9]{64})/
    )?.[1];

    if (!entitySecret) {
      logError("Failed to extract Entity Secret");
      console.log("Output:", secretOutput);
      process.exit(1);
    }

    console.log(`${colors.cyan}Your Entity Secret:${colors.reset}`);
    console.log(`${colors.green}${entitySecret}${colors.reset}\n`);

    logWarning(
      "Copy the Entity Secret above and save it in a secure location!"
    );

    // Step 2: Register the Entity Secret
    logInfo("\nStep 2: Registering Entity Secret with Circle...");

    const recoveryFilePath = resolve(__dirname, "../..");

    await registerEntitySecretCiphertext({
      apiKey: apiKey,
      entitySecret: entitySecret,
      recoveryFileDownloadPath: recoveryFilePath,
    });

    logSuccess("Entity Secret registered successfully!");

    // Step 3: Save to .env file
    logInfo("\nStep 3: Updating .env file...");

    const envFileContent = fs.readFileSync(envPath, "utf-8");

    // Check if CIRCLE_ENTITY_SECRET already exists
    if (
      envFileContent.includes("CIRCLE_ENTITY_SECRET=") &&
      !envFileContent.match(/CIRCLE_ENTITY_SECRET=\s*$/m)
    ) {
      logWarning("CIRCLE_ENTITY_SECRET already set in .env file");
      console.log("If you want to update it, manually edit the .env file");
    } else {
      // Add or update CIRCLE_ENTITY_SECRET
      let updatedContent;
      if (envFileContent.includes("CIRCLE_ENTITY_SECRET=")) {
        // Replace empty value
        updatedContent = envFileContent.replace(
          /CIRCLE_ENTITY_SECRET=.*/,
          `CIRCLE_ENTITY_SECRET=${entitySecret}`
        );
      } else {
        // Add after CIRCLE_API_KEY
        updatedContent = envFileContent.replace(
          /(CIRCLE_API_KEY=.*\n)/,
          `$1CIRCLE_ENTITY_SECRET=${entitySecret}\n`
        );
      }

      fs.writeFileSync(envPath, updatedContent);
      logSuccess("Entity Secret added to .env file");
    }

    // Step 4: Success message
    console.log(
      `\n${colors.green}=== Registration Complete! ===${colors.reset}\n`
    );

    console.log(`${colors.cyan}What was created:${colors.reset}`);
    console.log(`  1. Entity Secret: ${entitySecret.substring(0, 16)}...`);
    console.log(`  2. Recovery file: ${recoveryFilePath}`);
    console.log(`  3. Updated .env file with CIRCLE_ENTITY_SECRET`);

    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log("  1. ✓ Entity Secret is now registered and saved");
    console.log(
      "  2. Create a wallet: node contracts/scripts/create-circle-wallet.mjs"
    );
    console.log(
      "  3. Test the setup: node contracts/scripts/test-circle-wallet.mjs"
    );

    console.log(
      `\n${colors.yellow}⚠️  IMPORTANT SECURITY NOTES:${colors.reset}`
    );
    console.log(
      "  • Keep your Entity Secret safe - store it in a password manager"
    );
    console.log("  • The recovery file (.circle-recovery) is saved locally");
    console.log("  • Never commit .env or .circle-recovery to git");
    console.log("  • Circle does NOT store your Entity Secret\n");
  } catch (error) {
    logError("Failed to register Entity Secret");
    console.error("\nError:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }

    if (error.message.includes("already exists")) {
      logInfo("\nℹ️  Entity Secret already registered!");
      logInfo("You can proceed to create wallets:");
      console.log("  node contracts/scripts/create-circle-wallet.mjs\n");
    } else {
      process.exit(1);
    }
  }
}

registerEntitySecret();
