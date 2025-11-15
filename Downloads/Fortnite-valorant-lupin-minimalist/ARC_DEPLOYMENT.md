# Arc Safety Vault Deployment Guide

This guide covers deploying and configuring the LupinSafetyVault smart contract on Arc.

## Prerequisites

- Node.js and npm (for Hardhat/Foundry)
- Arc wallet with testnet ETH for gas
- USDC contract address on Arc
- Backend tester wallet (will be the oracle)

## Step 1: Deploy Smart Contract

### Option A: Using Hardhat

1. Install Hardhat in contracts directory:

```bash
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

2. Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    arc_testnet: {
      url: process.env.ARC_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: parseInt(process.env.ARC_CHAIN_ID || "0")
    }
  }
};
```

3. Create deployment script `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const usdcAddress = process.env.ARC_USDC_ADDRESS;
  
  if (!usdcAddress) {
    throw new Error("ARC_USDC_ADDRESS environment variable not set");
  }

  console.log("Deploying LupinSafetyVault...");
  console.log("USDC address:", usdcAddress);

  const LupinSafetyVault = await hre.ethers.getContractFactory("LupinSafetyVault");
  const vault = await LupinSafetyVault.deploy(usdcAddress);

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("✓ LupinSafetyVault deployed to:", vaultAddress);
  
  // Export ABI
  const artifact = await hre.artifacts.readArtifact("LupinSafetyVault");
  const fs = require('fs');
  fs.writeFileSync(
    '../backend/app/contracts/LupinSafetyVault.json',
    JSON.stringify({ abi: artifact.abi }, null, 2)
  );
  
  console.log("✓ ABI exported to backend/app/contracts/LupinSafetyVault.json");
  
  return vaultAddress;
}

main()
  .then((address) => {
    console.log("\n=== Deployment Complete ===");
    console.log("Add to your .env file:");
    console.log(`ARC_VAULT_CONTRACT_ADDRESS=${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

4. Deploy:

```bash
npx hardhat run scripts/deploy.js --network arc_testnet
```

### Option B: Using Remix IDE

1. Copy `contracts/LupinSafetyVault.sol` to Remix
2. Compile with Solidity 0.8.20+
3. Deploy with USDC address as constructor parameter
4. Copy deployed contract address
5. Export ABI and save to `backend/app/contracts/LupinSafetyVault.json`

## Step 2: Configure Tester Address

After deployment, set the backend tester address as oracle:

```javascript
// Using ethers.js or web3.js
const vault = new ethers.Contract(vaultAddress, abi, deployerWallet);
await vault.setTester(BACKEND_TESTER_ADDRESS);
```

Or using Remix:
- Call `setTester()` with your backend tester address

## Step 3: Backend Configuration

Create `.env` file in `backend/` directory:

```env
# Arc Blockchain Configuration
ARC_RPC_URL=https://arc-testnet-rpc.example.com
ARC_CHAIN_ID=123456
ARC_USDC_ADDRESS=0x...
ARC_VAULT_CONTRACT_ADDRESS=0x...
ARC_TESTER_PRIVATE_KEY=0x...
ARC_GAS_PRICE=

# Existing API Keys
OPENROUTER_KEY=sk-or-v1-...
PERPLEXITY_API_KEY=pplx-...
HUGGINGFACE_API_KEY=hf_...

# Notification Settings (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=security@lupin-red-team.com
NOTIFICATION_ENABLED=true
```

## Step 4: Install Updated Dependencies

```bash
cd backend
python3 -m pip install -r requirements.txt
```

This will install:
- `web3==6.15.1` - Web3 client
- `eth-account==0.11.0` - Account management
- `aiohttp==3.9.3` - Async HTTP (for notifications)

## Step 5: Initialize Database

The new `Project` model will be auto-created on startup:

```bash
cd backend
python3 -m uvicorn app.main:app --reload
```

## Step 6: Verify Setup

### Test Arc Client

```bash
python3 -c "
from app.services.arc_client import arc_client
if arc_client:
    print('✓ Arc client initialized')
    print(f'Tester address: {arc_client.tester_address}')
    print(f'Chain ID: {arc_client.chain_id}')
else:
    print('✗ Arc client failed to initialize')
"
```

### Test Endpoints

```bash
# Check if projects router is registered
curl http://localhost:8000/api/projects/stats/summary

# Should return: {"total_projects": 0, "message": "0 projects registered"}
```

## Step 7: Frontend Configuration

Create `frontend/.env`:

```env
VITE_ARC_CHAIN_ID=123456
VITE_ARC_VAULT_ADDRESS=0x...
VITE_ARC_USDC_ADDRESS=0x...
```

## Testing Flow

### 1. Create a Project (via wallet)

For now, use Remix or ethers.js directly:

```javascript
// Approve USDC first
const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, wallet);
await usdc.approve(VAULT_ADDRESS, ethers.parseUnits("100", 6)); // 100 USDC

// Create project
const vault = new ethers.Contract(VAULT_ADDRESS, vaultAbi, wallet);
const tx = await vault.createProject(
  90,    // minScore
  500,   // payoutRateBps (5%)
  500,   // penaltyRateBps (5%)
  ethers.parseUnits("100", 6) // 100 USDC
);

const receipt = await tx.wait();
const event = receipt.logs.find(log => log.topics[0] === vault.interface.getEvent("ProjectCreated").topicHash);
const projectId = event.args.projectId;

console.log("Project created:", projectId);
```

### 2. Register Project in Backend

```bash
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "onchain_project_id": 1,
    "owner_address": "0xYourAddress",
    "name": "Test Project",
    "target_model": "gpt-4"
  }'
```

### 3. Run Safety Test

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-or-v1-...",
    "max_exploits": 50
  }'
```

This will:
- Run regression tests against the target model
- Calculate safety score (0-100)
- Record result on-chain via `recordTestResult()`
- Apply reward/penalty logic automatically

## Troubleshooting

### Arc client not initialized

Check that all required env vars are set:
- `ARC_RPC_URL`
- `ARC_CHAIN_ID`
- `ARC_VAULT_CONTRACT_ADDRESS`
- `ARC_TESTER_PRIVATE_KEY`

### Transaction fails

- Ensure tester address has gas (ETH) on Arc
- Verify tester is set as oracle: `vault.tester() == BACKEND_TESTER_ADDRESS`
- Check project is active: `vault.projects(projectId).active == true`
- Ensure global pause is off: `vault.globalPaused() == false`

### ABI errors

Re-export ABI after any contract changes and restart backend.

## Security Notes

- **Never commit private keys** - Use `.env` file (already in .gitignore)
- **Tester key security** - This key controls on-chain test recording; protect it
- **Admin key** - Keep deployer key secure; it can pause contract and update tester
- **Project owner keys** - Each project owner controls their own funds; they sign withdrawals

## Next Steps

- Add wallet integration to frontend (WalletConnect, RainbowKit, etc.)
- Implement frontend create project flow
- Add withdraw rewards button (calls contract directly via wallet)
- Optional: Add bounty management UI

