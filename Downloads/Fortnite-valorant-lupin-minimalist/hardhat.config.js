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
    // Supports multiple RPC endpoints via ARC_RPC_URL env var
    arcTestnet: {
      type: 'http',
      url: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
      chainId: Number(process.env.ARC_CHAIN_ID || 5042002),
      accounts: process.env.ARC_DEPLOYER_KEY ? [process.env.ARC_DEPLOYER_KEY] : [],
      timeout: 60000  // 60s timeout for slow testnet RPC
    },
    // Alternative Arc testnet RPCs (swap in .env if main RPC is flaky)
    arcTestnetBlockdaemon: {
      type: 'http',
      url: 'https://rpc.blockdaemon.testnet.arc.network',
      chainId: 5042002,
      accounts: process.env.ARC_DEPLOYER_KEY ? [process.env.ARC_DEPLOYER_KEY] : []
    },
    arcTestnetDRPC: {
      type: 'http',
      url: 'https://rpc.drpc.testnet.arc.network',
      chainId: 5042002,
      accounts: process.env.ARC_DEPLOYER_KEY ? [process.env.ARC_DEPLOYER_KEY] : []
    },
    arcTestnetQuicknode: {
      type: 'http',
      url: 'https://rpc.quicknode.testnet.arc.network',
      chainId: 5042002,
      accounts: process.env.ARC_DEPLOYER_KEY ? [process.env.ARC_DEPLOYER_KEY] : []
    }
  }
};

export default config;

