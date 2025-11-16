# Arc Testnet Configuration Guide

## Official Arc Testnet Details

From Circle's official documentation:

| Setting | Value |
|---------|-------|
| **Network** | Arc Testnet |
| **RPC URL** | `https://rpc.testnet.arc.network` |
| **Chain ID** | `5042002` |
| **USDC Address** | `0x3600000000000000000000000000000000000000` |
| **USDC Decimals** | **6 decimals** (ERC-20 interface) |
| **Block Explorer** | https://testnet.arcscan.app |
| **Faucet** | https://faucet.circle.com/ |

**Alternative RPCs** (if primary is slow):
- `https://rpc.blockdaemon.testnet.arc.network`
- `https://rpc.drpc.testnet.arc.network`
- `https://rpc.quicknode.testnet.arc.network`

---

## 📋 Complete .env Configuration

Create `backend/.env` with these values:

```env
# ============================================
# Arc Testnet Configuration (Official)
# ============================================

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000

# ⚠️ FILL THESE IN AFTER DEPLOYMENT:
ARC_VAULT_CONTRACT_ADDRESS=  # Your deployed LupinSafetyVault address
ARC_TESTER_PRIVATE_KEY=      # Backend oracle wallet private key
ARC_GAS_PRICE=               # Optional: leave empty for auto

# ============================================
# API Keys (Keep Your Existing Values)
# ============================================

OPENROUTER_KEY=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
PERPLEXITY_API_KEY=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
HUGGINGFACE_API_KEY=your_huggingface_key_here

DEFAULT_SEARCH_TYPE=web
MAX_SEARCH_RESULTS=10

# ============================================
# Notification Settings (Optional)
# ============================================

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=security@lupin-red-team.com
NOTIFICATION_ENABLED=true
```

---

## 🚀 Deployment Steps

### Step 1: Get Test USDC (2 minutes)

1. Go to https://faucet.circle.com/
2. Select **Arc Testnet** as network
3. Select **USDC** as token
4. Enter your wallet address
5. Click request
6. You'll receive test USDC (for gas + escrow)

### Step 2: Deploy LupinSafetyVault (5 minutes)

**Option A: Using Remix (Recommended)**

1. Open https://remix.ethereum.org
2. Create new file: `LupinSafetyVault.sol`
3. Copy content from `contracts/LupinSafetyVault.sol`
4. Compile:
   - Compiler version: 0.8.20 or higher
   - Click "Compile LupinSafetyVault.sol"
5. Deploy:
   - Switch to "Deploy & Run Transactions" tab
   - Environment: "Injected Provider - MetaMask"
   - In MetaMask: Add Arc Testnet
     - Network Name: Arc Testnet
     - RPC URL: `https://rpc.testnet.arc.network`
     - Chain ID: `5042002`
     - Currency Symbol: USDC
     - Block Explorer: `https://testnet.arcscan.app`
   - Constructor parameter: `0x3600000000000000000000000000000000000000`
   - Click "Deploy"
   - Confirm in MetaMask
6. **Copy deployed contract address** (you'll see it in Remix console)
7. Verify on explorer: https://testnet.arcscan.app/address/YOUR_ADDRESS

**Option B: Using Hardhat**

See `ARC_DEPLOYMENT.md` for Hardhat instructions.

### Step 3: Generate Tester Wallet (2 minutes)

**Option A: Using ethers.js**
```bash
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey)"
```

**Option B: Using MetaMask**
- Create new account
- Export private key (Settings → Security & Privacy → Reveal Private Key)

**Important:**
- This wallet is the **backend oracle** - it signs test result transactions
- Fund it with small amount of USDC from faucet (for gas)
- Copy both address and private key

### Step 4: Set Tester in Contract (1 minute)

In Remix:
1. Go to deployed contract
2. Call `setTester` function
3. Parameter: Your tester address from Step 3
4. Click "transact"
5. Confirm in MetaMask

### Step 5: Create .env File (1 minute)

```bash
cd backend
# Copy the template above to .env and fill in:
# - ARC_VAULT_CONTRACT_ADDRESS (from Step 2)
# - ARC_TESTER_PRIVATE_KEY (from Step 3)
```

### Step 6: Restart Backend

```bash
cd backend
uvicorn app.main:app --reload
```

You should see:
```
✓ Arc client initialized
Tester address: 0x...
Chain ID: 5042002
```

---

## 🎯 Quick Deploy Checklist

- [ ] Get USDC from faucet (https://faucet.circle.com/)
- [ ] Deploy LupinSafetyVault via Remix
  - Constructor: `0x3600000000000000000000000000000000000000`
  - Network: Arc Testnet (ChainID 5042002)
- [ ] Copy deployed contract address
- [ ] Generate tester wallet
- [ ] Fund tester with USDC from faucet
- [ ] Call `setTester(testerAddress)` in Remix
- [ ] Create `backend/.env` with all values
- [ ] Restart backend

---

## 🔍 Verification Commands

After configuration:

```bash
# 1. Verify backend connects to Arc
cd backend
python3 -c "from app.services.arc_client import arc_client; print('✓ Connected' if arc_client else '✗ Failed')"

# 2. Check tester address
python3 -c "from app.services.arc_client import arc_client; print(f'Tester: {arc_client.tester_address if arc_client else \"Not configured\"}')"

# 3. Test reading contract
python3 -c "from app.services.arc_client import arc_client; print(f'Next Project ID: {arc_client.vault_contract.functions.nextProjectId().call() if arc_client else \"N/A\"}')"
```

---

## 💡 Pro Tips

1. **Use Alternative RPC** if primary is slow:
   ```env
   ARC_RPC_URL=https://rpc.blockdaemon.testnet.arc.network
   ```

2. **Check Explorer** after deployment:
   - Verify contract at https://testnet.arcscan.app/address/YOUR_ADDRESS
   - View transactions, events, state

3. **Test Small First**:
   - Create first project with small USDC amount (10-100 USDC)
   - Run test to verify everything works
   - Scale up after validation

4. **Keep Keys Safe**:
   - Never commit `.env` file (already in .gitignore)
   - Backend tester key = server-side only
   - Admin key = use hardware wallet for production

---

## 🐛 Troubleshooting

### "Cannot connect to Arc RPC"
- Try alternative RPC URLs above
- Check internet connection
- Verify chain ID matches (5042002)

### "USDC transfer failed"
- Ensure wallet has USDC from faucet
- Approve USDC to vault contract first
- Check USDC address is correct (0x36000...)

### "Transaction reverted"
- Check tester address is set correctly
- Ensure tester has USDC for gas
- Verify global pause is off

---

## 📖 Additional Resources

- **Arc Testnet Faucet**: https://faucet.circle.com/
- **Arc Explorer**: https://testnet.arcscan.app
- **Deployment Guide**: See `ARC_DEPLOYMENT.md`
- **Full Docs**: See `ARC_INTEGRATION_README.md`

**Ready to deploy?** Follow the steps above and you'll be running on Arc in ~10 minutes!

