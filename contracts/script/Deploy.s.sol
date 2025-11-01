// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PaymentStreaming.sol";
import "../src/ReputationLedger.sol";
import "../src/MicroLoan.sol";

/**
 * @title Deploy Script for GigStream Contracts
 * @notice Deploys all three smart contracts to Arc testnet:
 *         - ReputationLedger
 *         - PaymentStreaming
 *         - MicroLoan
 * 
 * Usage:
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url $ARC_RPC_URL --broadcast --legacy
 * 
 * The --legacy flag is required for Arc testnet compatibility
 */
contract DeployScript is Script {
    // Arc testnet USDC address
    address constant ARC_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying contracts to Arc testnet...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Deploy ReputationLedger (no constructor args)
        console.log("\nDeploying ReputationLedger...");
        ReputationLedger reputationLedger = new ReputationLedger();
        console.log("ReputationLedger deployed at:", address(reputationLedger));
        
        // Deploy PaymentStreaming (requires USDC address)
        console.log("\nDeploying PaymentStreaming...");
        console.log("Using USDC token:", ARC_USDC);
        PaymentStreaming paymentStreaming = new PaymentStreaming(ARC_USDC);
        console.log("PaymentStreaming deployed at:", address(paymentStreaming));
        
        // Deploy MicroLoan (requires USDC address and ReputationLedger address)
        console.log("\nDeploying MicroLoan...");
        console.log("Using USDC token:", ARC_USDC);
        console.log("Using ReputationLedger:", address(reputationLedger));
        MicroLoan microLoan = new MicroLoan(ARC_USDC, address(reputationLedger));
        console.log("MicroLoan deployed at:", address(microLoan));
        
        vm.stopBroadcast();
        
        // Log deployment summary
        console.log("\n================================");
        console.log("Deployment Summary");
        console.log("================================");
        console.log("ReputationLedger:", address(reputationLedger));
        console.log("PaymentStreaming:", address(paymentStreaming));
        console.log("MicroLoan:", address(microLoan));
        console.log("USDC Token:", ARC_USDC);
        console.log("================================");
        
        console.log("\nNext steps:");
        console.log("1. Update .env with contract addresses");
        console.log("2. Run: node contracts/scripts/update-deployment.mjs");
        console.log("3. Verify deployment: node contracts/scripts/test-deployed-contracts.mjs");
    }
}
