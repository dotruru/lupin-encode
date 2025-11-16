import dotenv from 'dotenv';

dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    // Re‑use the existing contracts folder in this repo
    sources: './contracts'
  },
  networks: {
    // Arc testnet configuration – make sure ARC_DEPLOYER_KEY is set in your .env
    arcTestnet: {
      type: 'http',
      url: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
      chainId: Number(process.env.ARC_CHAIN_ID || 5042002),
      accounts: process.env.ARC_DEPLOYER_KEY ? [process.env.ARC_DEPLOYER_KEY] : []
    }
  }
};

export default config;

