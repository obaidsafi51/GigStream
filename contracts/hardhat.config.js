import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    arcTestnet: {
      type: "http",
      url: process.env.ARC_RPC_URL || "https://arc-testnet.rpc.circle.com",
      chainId: parseInt(process.env.ARC_CHAIN_ID || "613"),
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: process.env.ARC_EXPLORER_API_KEY || "dummy",
  },
};
