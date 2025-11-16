# LupinSafetyVault Smart Contract

## Security Improvements Applied

The contract now includes production-grade security features:

✅ **SafeERC20** - Handles non-standard ERC20 tokens safely  
✅ **ReentrancyGuard** - Prevents reentrancy attacks on withdrawals  
✅ **CEI Pattern** - Checks-Effects-Interactions pattern enforced  
✅ **Stack Optimization** - Refactored to avoid "stack too deep" errors  
✅ **Input Validation** - All parameters validated  

## Compilation

### Option 1: Remix IDE (Easiest - Recommended)

1. Go to https://remix.ethereum.org
2. Install **OpenZeppelin Contracts**:
   - Remix automatically resolves `@openzeppelin/contracts` imports from GitHub
   - No manual installation needed!
3. Create `LupinSafetyVault.sol` and paste the contract code
4. **Compiler Settings** (Important!):
   - **Compiler Version**: `0.8.20` or higher
   - **EVM Version**: `paris` or `shanghai`
   - **Optimization**: ✅ **ENABLED** (200 runs)
   - **Via IR**: Optional (not required - contract is optimized for default compiler)
5. Click "Compile LupinSafetyVault.sol"
6. Should compile with **0 errors** ✅
7. Deploy to Arc Testnet

**Note on Stack Too Deep**: 
- ✅ Fixed via refactoring (no `--via-ir` required)
- Works with default Remix settings
- If you still see errors, enable "Via IR" in advanced settings

### Option 2: Hardhat (For Local Development)

```bash
# 1. Initialize project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts

# 2. Create hardhat.config.js
cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    arc_testnet: {
      url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 5042002
    }
  }
};
EOF

# 3. Compile
npx hardhat compile

# 4. Deploy
npx hardhat run scripts/deploy.js --network arc_testnet
```

### Option 3: Foundry (Advanced)

```bash
# 1. Initialize
forge init
forge install OpenZeppelin/openzeppelin-contracts

# 2. Add remappings
echo "@openzeppelin/=lib/openzeppelin-contracts/" > remappings.txt

# 3. Compile
forge build

# 4. Deploy
forge create LupinSafetyVault \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0x3600000000000000000000000000000000000000
```

## Deployment to Arc Testnet

### Prerequisites

1. **Get Test USDC**:
   - Visit https://faucet.circle.com/
   - Select "Arc Testnet"
   - Select "USDC"
   - Enter your wallet address
   - Request tokens (you'll get ~100 USDC for gas)

2. **Add Arc Testnet to MetaMask**:
   - Network Name: `Arc Testnet`
   - RPC URL: `https://rpc.testnet.arc.network`
   - Chain ID: `5042002`
   - Currency Symbol: `USDC`
   - Block Explorer: `https://testnet.arcscan.app`

### Deployment Steps (Remix)

1. Open https://remix.ethereum.org
2. Create new file: `LupinSafetyVault.sol`
3. Paste contract code
4. Compile with Solidity 0.8.20+ (optimizer enabled)
5. Switch to "Deploy & Run Transactions"
6. Environment: "Injected Provider - MetaMask"
7. Connect to Arc Testnet in MetaMask
8. Constructor parameter: `0x3600000000000000000000000000000000000000` (USDC address)
9. Click "Deploy"
10. Confirm transaction in MetaMask
11. **Copy deployed contract address** from console
12. Verify on explorer: https://testnet.arcscan.app/address/YOUR_ADDRESS

### Post-Deployment Configuration

After deployment, you must:

1. **Set Tester Address** (as admin):
   ```solidity
   vault.setTester(YOUR_BACKEND_TESTER_ADDRESS)
   ```

2. **Update Backend .env**:
   ```env
   ARC_VAULT_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
   ```

3. **Export ABI**:
   - In Remix: Copy ABI from Compilation tab
   - Save to `backend/app/contracts/LupinSafetyVault.json`

## Arc Testnet Details

| Setting | Value |
|---------|-------|
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC URL | `https://rpc.testnet.arc.network` |
| USDC Address | `0x3600000000000000000000000000000000000000` |
| USDC Decimals | **6 decimals** (ERC-20 interface) |
| Block Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com/ |

**Important**: Arc's native USDC uses 18 decimals, but the ERC-20 interface uses **6 decimals**. Our contract uses the ERC-20 interface (6 decimals).

## Security Features

### Reentrancy Protection
```solidity
function withdrawRewards() external nonReentrant {
    // State updated before transfer
    projects[projectId].rewardBalance = 0;
    usdc.safeTransfer(owner, amount);
}
```

### SafeERC20
```solidity
// Instead of:
require(usdc.transfer(to, amount), "Transfer failed");

// We use:
usdc.safeTransfer(to, amount); // Reverts on failure
```

### Checks-Effects-Interactions (CEI)
All state changes happen before external calls to prevent reentrancy.

### Access Control
- `onlyAdmin` - Admin-only functions
- `onlyTester` - Oracle-only functions
- `onlyProjectOwner` - Project owner-only functions
- `whenNotGlobalPaused` - Blocks functions during emergency

## Gas Estimates (Approximate)

| Function | Gas (Optimized) |
|----------|-----------------|
| createProject | ~150,000 |
| depositEscrow | ~50,000 |
| recordTestResult | ~100,000 |
| withdrawRewards | ~50,000 |
| createBountyPayout | ~50,000 |
| claimBounty | ~50,000 |

**On Arc**: USDC is used for gas, so costs are in USDC.

## Testing Locally

```bash
# Using Hardhat
npx hardhat test

# Using Foundry
forge test -vvv
```

## Verification

After deployment, verify the contract:

```bash
# Using Hardhat
npx hardhat verify --network arc_testnet \
  DEPLOYED_ADDRESS \
  "0x3600000000000000000000000000000000000000"
```

Or use the Arc explorer's contract verification feature.

## Common Issues

### "Stack too deep"
✅ **Fixed** - Refactored to use internal functions

### "Transfer failed"
- Ensure caller has approved USDC to vault
- Check USDC balance is sufficient
- Verify USDC address is correct

### "Only tester"
- Ensure tester address is set: `vault.setTester(address)`
- Call from correct backend wallet

### Compilation errors
- Use Solidity 0.8.20 or higher
- Enable optimizer (200 runs)
- Import OpenZeppelin contracts properly

## License

MIT License - See contract header

