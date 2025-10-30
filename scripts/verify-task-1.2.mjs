#!/usr/bin/env node

/**
 * Task 1.2 Verification Script
 * Verifies all components of Development Environment Setup
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

let passCount = 0;
let failCount = 0;

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(description, testFn) {
  try {
    const result = testFn();
    if (result) {
      log(`✓ ${description}`, "green");
      passCount++;
      return true;
    } else {
      log(`✗ ${description}`, "red");
      failCount++;
      return false;
    }
  } catch (error) {
    log(`✗ ${description}: ${error.message}`, "red");
    failCount++;
    return false;
  }
}

function exec(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(error.stderr || error.message);
  }
}

log("\n╔════════════════════════════════════════════════════════════╗", "cyan");
log("║       TASK 1.2: Development Environment Verification      ║", "cyan");
log("╚════════════════════════════════════════════════════════════╝\n", "cyan");

// 1. Node.js Version Check
log("1. Checking Node.js installation...", "blue");
check("Node.js v18+ installed", () => {
  const version = exec("node --version");
  const majorVersion = parseInt(version.replace("v", "").split(".")[0]);
  log(`   Version: ${version}`, "cyan");
  return majorVersion >= 18;
});

// 2. npm/yarn Check
log("\n2. Checking package manager...", "blue");
check("npm installed", () => {
  const version = exec("npm --version");
  log(`   npm version: ${version}`, "cyan");
  return version.length > 0;
});

// 3. Foundry Installation
log("\n3. Checking Foundry installation...", "blue");
check("forge installed", () => {
  const version = exec("forge --version");
  const match = version.match(/forge Version: ([\d.]+)/);
  if (match) {
    log(`   Forge version: ${match[1]}`, "cyan");
  }
  return version.includes("forge");
});

check("cast installed", () => {
  const version = exec("cast --version");
  return version.includes("cast");
});

check("anvil installed", () => {
  const version = exec("anvil --version");
  return version.includes("anvil");
});

// 4. PostgreSQL Check
log("\n4. Checking PostgreSQL installation...", "blue");
check("PostgreSQL 15+ installed", () => {
  const version = exec("psql --version");
  const match = version.match(/PostgreSQL\) ([\d.]+)/);
  if (match) {
    const majorVersion = parseInt(match[1].split(".")[0]);
    log(`   Version: PostgreSQL ${match[1]}`, "cyan");
    return majorVersion >= 15;
  }
  return false;
});

check("Database gigstream_dev exists", () => {
  const result = exec(
    "sudo -u postgres psql -lqt | cut -d \\| -f 1 | grep -w gigstream_dev"
  );
  return result.includes("gigstream_dev");
});

check("Database connection works", () => {
  const result = exec(
    "PGPASSWORD='gigstream_password' psql -h localhost -U gigstream -d gigstream_dev -c 'SELECT 1' -t"
  );
  return result.trim() === "1";
});

// 5. Arc Testnet RPC Check
log("\n5. Checking Arc testnet RPC access...", "blue");
check("Arc testnet RPC accessible", () => {
  const result = exec(
    'curl -s https://rpc.testnet.arc.network -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}\''
  );
  const data = JSON.parse(result);
  const chainId = parseInt(data.result, 16);
  log(`   Chain ID: ${chainId} (0x${chainId.toString(16)})`, "cyan");
  return chainId === 5042002;
});

check("Arc testnet block sync working", () => {
  const result = exec(
    'curl -s https://rpc.testnet.arc.network -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\''
  );
  const data = JSON.parse(result);
  const blockNumber = parseInt(data.result, 16);
  log(`   Latest block: ${blockNumber}`, "cyan");
  return blockNumber > 0;
});

// 6. VS Code Configuration
log("\n6. Checking VS Code configuration...", "blue");
check(".vscode/extensions.json exists", () => {
  const path = join(rootDir, ".vscode", "extensions.json");
  if (existsSync(path)) {
    const content = JSON.parse(readFileSync(path, "utf8"));
    log(
      `   Extensions configured: ${content.recommendations?.length || 0}`,
      "cyan"
    );
    return content.recommendations && content.recommendations.length > 0;
  }
  return false;
});

check(".vscode/settings.json exists", () => {
  const path = join(rootDir, ".vscode", "settings.json");
  return existsSync(path);
});

// 7. Environment Files
log("\n7. Checking environment files...", "blue");
check(".env.example exists", () => {
  const path = join(rootDir, ".env.example");
  if (existsSync(path)) {
    const content = readFileSync(path, "utf8");
    const requiredVars = [
      "ARC_RPC_URL",
      "CIRCLE_API_KEY",
      "DATABASE_URL",
      "JWT_SECRET",
      "NEXT_PUBLIC_API_BASE_URL",
    ];
    const hasAll = requiredVars.every((v) => content.includes(v));
    if (hasAll) {
      log(`   All required variables present`, "cyan");
    }
    return hasAll;
  }
  return false;
});

check(".env exists and populated", () => {
  const path = join(rootDir, ".env");
  if (existsSync(path)) {
    const content = readFileSync(path, "utf8");
    return (
      content.includes("CIRCLE_API_KEY") && content.includes("DATABASE_URL")
    );
  }
  return false;
});

// 8. Circle SDK Installation
log("\n8. Checking Circle SDK...", "blue");
check("Circle SDK installed in contracts/", () => {
  const path = join(
    rootDir,
    "contracts",
    "node_modules",
    "@circle-fin",
    "developer-controlled-wallets"
  );
  return existsSync(path);
});

// 9. Foundry Configuration
log("\n9. Checking Foundry configuration...", "blue");
check("foundry.toml configured", () => {
  const path = join(rootDir, "contracts", "foundry.toml");
  if (existsSync(path)) {
    const content = readFileSync(path, "utf8");
    const hasRpc = content.includes("arc_testnet");
    const hasSolc = content.includes("solc_version");
    const hasRemappings = content.includes("@openzeppelin");
    log(`   RPC endpoint: ${hasRpc ? "✓" : "✗"}`, "cyan");
    log(`   Solidity version: ${hasSolc ? "✓" : "✗"}`, "cyan");
    log(`   OpenZeppelin remappings: ${hasRemappings ? "✓" : "✗"}`, "cyan");
    return hasRpc && hasSolc && hasRemappings;
  }
  return false;
});

check("OpenZeppelin contracts installed", () => {
  const path = join(rootDir, "contracts", "lib", "openzeppelin-contracts");
  return existsSync(path);
});

check("forge-std installed", () => {
  const path = join(rootDir, "contracts", "lib", "forge-std");
  return existsSync(path);
});

// Summary
log("\n" + "═".repeat(60), "cyan");
log(
  `\n📊 Results: ${passCount} passed, ${failCount} failed\n`,
  failCount > 0 ? "yellow" : "green"
);

if (failCount === 0) {
  log("🎉 Task 1.2 is COMPLETE!", "green");
  log("✅ Development environment is fully set up and ready\n", "green");
  process.exit(0);
} else {
  log("⚠️  Task 1.2 has some incomplete items", "yellow");
  log("Please address the failed checks above\n", "yellow");
  process.exit(1);
}
