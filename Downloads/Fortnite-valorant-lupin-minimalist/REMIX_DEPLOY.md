# 🎯 Deploy to Arc Testnet via Remix - Step by Step

## Your Wallet
**Address**: `0x51a61263b7485ac160f6f8f46fed5cce7b9e83d5`

## Arc Testnet Info (Official)
- **RPC**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **USDC**: `0x3600000000000000000000000000000000000000` (6 decimals)
- **Explorer**: `https://testnet.arcscan.app`
- **Faucet**: `https://faucet.circle.com/`

---

## 🚀 Deployment Steps (15 Minutes)

### Step 1: Get Test USDC (3 min)

1. Go to: **https://faucet.circle.com/**
2. Connect your wallet or enter: `0x51a61263b7485ac160f6f8f46fed5cce7b9e83d5`
3. Select: **Arc Testnet**
4. Select: **USDC**
5. Click: **Request Tokens**
6. Wait: You'll receive ~100 USDC

**Verify**: Check balance on https://testnet.arcscan.app/address/0x51a61263b7485ac160f6f8f46fed5cce7b9e83d5

---

### Step 2: Add Arc Testnet to MetaMask (2 min)

1. Open MetaMask
2. Click network dropdown
3. Click "Add Network" → "Add Network Manually"
4. Enter:
   ```
   Network Name: Arc Testnet
   RPC URL: https://rpc.testnet.arc.network
   Chain ID: 5042002
   Currency Symbol: USDC
   Block Explorer: https://testnet.arcscan.app
   ```
5. Click "Save"
6. Switch to Arc Testnet network
7. Verify your USDC balance shows

---

### Step 3: Open Remix & Setup (2 min)

1. Go to: **https://remix.ethereum.org**
2. In File Explorer (left panel):
   - Click "Create New File"
   - Name it: `LupinSafetyVault.sol`
3. Copy **entire content** from:
   - File: `contracts/LupinSafetyVault_Remix.sol` ← **Use this version!**
   - (This is the Remix-optimized version)
4. Paste into Remix editor

---

### Step 4: Compile Contract (2 min)

1. Click **Solidity Compiler** icon (left panel)
2. Settings:
   - **Compiler**: `0.8.20` or higher (e.g., 0.8.24)
   - **EVM Version**: `shanghai` or `paris`
   - **Enable Optimization**: ✅ **YES**
   - **Runs**: `200`
3. Click: **Compile LupinSafetyVault.sol**
4. Wait for: ✅ **Green checkmark** (no errors)

**If you see errors**:
- Make sure you're using `LupinSafetyVault_Remix.sol` (simplified version)
- Check compiler version is 0.8.20+
- Ensure Optimization is enabled

---

### Step 5: Deploy to Arc Testnet (5 min)

1. Click **Deploy & Run Transactions** icon (left panel)
2. Settings:
   - **Environment**: `Injected Provider - MetaMask`
   - **Account**: Should show your wallet `0x51a6...83d5`
   - **Contract**: `LupinSafetyVault`
3. **IMPORTANT - Constructor Parameter**:
   - In the field next to Deploy button, enter:
     ```
     0x3600000000000000000000000000000000000000
     ```
   - This is the USDC address on Arc Testnet
4. Click: **Deploy** (orange button)
5. MetaMask popup appears:
   - Network: Verify it says "Arc Testnet"
   - Review transaction
   - Click **Confirm**
6. Wait ~10-30 seconds for confirmation
7. In Remix console (bottom), you'll see:
   ```
   [vm] from: 0x51a...83d5
   to: LupinSafetyVault.(constructor)
   value: 0 wei
   status: true Transaction mined and execution succeed
   transaction hash: 0x...
   contract address: 0x... ← COPY THIS!
   ```

**COPY THE CONTRACT ADDRESS!** You'll need it for backend configuration.

---

### Step 6: Verify Deployment (1 min)

1. Copy your deployed contract address
2. Go to: `https://testnet.arcscan.app/address/YOUR_CONTRACT_ADDRESS`
3. You should see:
   - Contract created
   - Transaction history
   - Contract state

**In Remix**, you should now see the deployed contract in the left panel with all functions visible.

---

### Step 7: Generate Tester Wallet (1 min)

Back in your terminal:

```bash
cd /Users/arukanussipzhan/Downloads/Fortnite-valorant-lupin-minimalist
python3 generate_tester_wallet.py
```

Output will show:
```
Address: 0x... ← COPY THIS
Private Key: 0x... ← COPY THIS (keep secret!)
```

---

### Step 8: Fund Tester Wallet (2 min)

1. Go to: **https://faucet.circle.com/**
2. Enter: **Tester address from Step 7**
3. Select: **Arc Testnet + USDC**
4. Request tokens
5. Wait for confirmation

---

### Step 9: Set Tester in Contract (1 min)

Back in Remix:

1. Under **Deployed Contracts**, find your `LupinSafetyVault`
2. Expand to see functions
3. Find `setTester` function
4. Enter: **Tester address from Step 7**
5. Click **transact** (orange button)
6. Confirm in MetaMask
7. Wait for confirmation

**Verify**: Call `tester()` function - should return your tester address

---

### Step 10: Configure Backend (2 min)

Create file: `backend/.env`

```env
# Arc Testnet Configuration
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_VAULT_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_FROM_STEP_5
ARC_TESTER_PRIVATE_KEY=0xYOUR_TESTER_PRIVATE_KEY_FROM_STEP_7

# Keep existing API keys
OPENROUTER_KEY=your_openrouter_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here
```

---

### Step 11: Start Backend (1 min)

```bash
cd backend
python3 -m pip install greenlet==3.0.3  # If not already installed
uvicorn app.main:app --reload
```

**Expected Output**:
```
✓ Arc client initialized
Tester address: 0x...
Chain ID: 5042002
INFO: Application startup complete.
```

---

### Step 12: Start Frontend (1 min)

New terminal:

```bash
cd /Users/arukanussipzhan/Downloads/Fortnite-valorant-lupin-minimalist/frontend
npm run dev
```

Open: **http://localhost:5173**

---

## ✅ Verification

### In Browser (Frontend)
1. Click **"ARC VAULT"** tab
2. Should show: "No projects yet" (correct - none created yet)
3. Click "CREATE PROJECT" button
4. Form should display

### Test Backend API

```bash
# Check projects endpoint
curl http://localhost:8000/api/projects/stats/summary

# Should return:
{"total_projects": 0, "message": "0 projects registered"}
```

---

## 🧪 Create Your First Project

### In Remix (Deployed Contract)

1. **Approve USDC**:
   - Go to USDC contract: `0x3600000000000000000000000000000000000000`
   - Call `approve`
   - Parameters:
     - `spender`: Your vault contract address
     - `amount`: `100000000` (100 USDC with 6 decimals)
   - Transact → Confirm in MetaMask

2. **Create Project**:
   - Go back to your deployed LupinSafetyVault
   - Call `createProject`
   - Parameters:
     - `minScore`: `90` (90% safety threshold)
     - `payoutRateBps`: `500` (5% reward rate)
     - `penaltyRateBps`: `500` (5% penalty rate)
     - `initialDeposit`: `100000000` (100 USDC)
   - Transact → Confirm in MetaMask

3. **Check Event**:
   - In Remix console, find `ProjectCreated` event
   - Note the `projectId` (should be `1`)

### Register in Backend

```bash
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "onchain_project_id": 1,
    "owner_address": "0x51a61263b7485ac160f6f8f46fed5cce7b9e83d5",
    "name": "My First Safety Project",
    "target_model": "gpt-4"
  }'
```

### View in UI

Refresh the Arc Vault tab - you should see your project!

---

## 🎯 Run First Safety Test

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID_FROM_RESPONSE/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "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",
    "max_exploits": 20
  }'
```

This will:
1. Test 20 exploits against GPT-4
2. Calculate safety score
3. Record result on-chain (via your tester wallet)
4. Apply reward or penalty automatically
5. Return transaction hash

**Check Results**:
- In response JSON: score, critical_count, tx_hash
- On explorer: `https://testnet.arcscan.app/tx/TX_HASH`
- In UI: Refresh Arc Vault tab to see updated balances

---

## 🐛 Troubleshooting

### Remix: "Undeclared identifier" or import errors
**Fix**: Make sure you're using `LupinSafetyVault_Remix.sol` (the simplified version)

### Remix: "Stack too deep"
**Fix**: 
1. Enable Optimization (200 runs)
2. Use Solidity 0.8.20+
3. Already refactored to avoid this

### MetaMask: "Wrong network"
**Fix**: Switch to Arc Testnet in MetaMask dropdown

### Transaction: "Insufficient funds"
**Fix**: Get more USDC from faucet

### Backend: "Arc client not initialized"
**Fix**: Make sure `.env` has `ARC_VAULT_CONTRACT_ADDRESS` and `ARC_TESTER_PRIVATE_KEY`

---

## 📞 Quick Reference

| What | Value |
|------|-------|
| **Your Wallet** | `0x51a61263b7485ac160f6f8f46fed5cce7b9e83d5` |
| **USDC Address** | `0x3600000000000000000000000000000000000000` |
| **Chain ID** | `5042002` |
| **RPC URL** | `https://rpc.testnet.arc.network` |
| **Faucet** | `https://faucet.circle.com/` |
| **Explorer** | `https://testnet.arcscan.app` |

---

## ✨ Success!

When you complete all steps, you'll have:

✅ Contract deployed on Arc Testnet  
✅ Backend connected to blockchain  
✅ Frontend showing live on-chain data  
✅ Ability to create projects and run tests  
✅ Full transparency via block explorer  

**Time to complete**: ~15 minutes following this guide!

Start with Step 1 and work through sequentially. Good luck! 🚀

