// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MicroLoan.sol";

/**
 * @title Deploy MicroLoan Contract
 * @notice Deploys MicroLoan contract to Arc testnet
 * 
 * Usage:
 *   forge script script/DeployMicroLoan.s.sol:DeployMicroLoanScript --rpc-url $ARC_RPC_URL --broadcast --legacy
 * 
 * The --legacy flag is required for Arc testnet compatibility
 */
contract DeployMicroLoanScript is Script {
    // Arc testnet USDC address
    address constant ARC_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    // Already deployed ReputationLedger address
    address constant REPUTATION_LEDGER = 0xbC1ec3A376126d943a5be1370E4208BaFc2D6482;
    
    function run() external {
        // Start broadcasting transactions (uses --private-key from command line)
        vm.startBroadcast();
        
        console.log("Deploying MicroLoan to Arc testnet...");
        console.log("Deployer:", msg.sender);
        console.log("Using USDC token:", ARC_USDC);
        console.log("Using ReputationLedger:", REPUTATION_LEDGER);
        
        // Deploy MicroLoan
        MicroLoan microLoan = new MicroLoan(ARC_USDC, REPUTATION_LEDGER);
        console.log("\nMicroLoan deployed at:", address(microLoan));
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n================================");
        console.log("Deployment Summary");
        console.log("================================");
        console.log("MicroLoan:", address(microLoan));
        console.log("USDC Token:", ARC_USDC);
        console.log("ReputationLedger:", REPUTATION_LEDGER);
        console.log("================================");
        
        console.log("\nNext steps:");
        console.log("1. Update CONTRACT_MICRO_LOAN in .env");
        console.log("2. Update contracts/deployments.json");
        console.log("3. Update frontend/lib/contracts.ts");
        console.log("4. Test deployment: node contracts/scripts/test-deployed-contracts.mjs");
    }
}
