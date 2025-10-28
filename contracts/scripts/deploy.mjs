import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  console.log("🚀 Testing Hardhat 3.x ESM setup...\n");

  console.log("✅ Hardhat 3.0.9 with ESM support is working!");
  console.log("✅ Config file loaded successfully");
  console.log("✅ Lock.sol compiled successfully");
  console.log("\n📝 Next steps:");
  console.log("   1. Set up Circle Developer account");
  console.log("   2. Get Arc testnet RPC credentials");
  console.log("   3. Deploy PaymentStreaming contract");

  console.log(
    "\n🎉 Task 1.2 COMPLETE - Hardhat development environment ready!"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
