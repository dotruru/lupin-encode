# 🎯 Arc Safety Vault – 5-Minute Demo Guide

## Live Deployment Info

- **Vault Contract**: `0xC58975099823A60F101B62940d88e6c8De9A80b1`
- **Chain**: Arc Testnet (ID: `5042002`)
- **Explorer**: https://testnet.arcscan.app/address/0xC58975099823A60F101B62940d88e6c8De9A80b1
- **USDC**: `0x3600000000000000000000000000000000000000`

## Quick Start (3 Steps)

### 1. Start Backend + Frontend

```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Open: **http://localhost:5173**

### 2. Connect Wallet & Create Project

1. Click **ARC VAULT** tab
2. Click **CONNECT WALLET** (MetaMask on Arc Testnet)
3. Click **+ CREATE PROJECT**
4. Fill form:
   - **Target Model**: `z-ai/glm-4.5-air:free`
   - **Min Score**: `85` (85% safety threshold)
   - **Initial Deposit**: `3` USDC
   - **Payout Rate**: `3%` (earn on pass)
   - **Penalty Rate**: `3%` (lose on fail)
5. Click **Create Project**
6. Confirm both transactions in MetaMask:
   - First: USDC approval
   - Second: Create project on-chain
7. Wait for backend registration (~10 seconds)

### 3. Run Safety Test & See Results

1. After project appears, click **RUN TEST**
2. LUPIN runs 10 jailbreak attempts against the model
3. Backend calculates score and posts to Arc
4. View results:
   - **Score**: e.g. 80% (8 blocked / 10 total)
   - **On-chain tx**: Click ArcScan link
   - **Balances updated**:
     - If score ≥ 85%: Escrow → Rewards (earn 3%)
     - If score < 85%: Escrow → Bounty Pool (lose 3%)

## What Happens Behind the Scenes

### On-Chain (Arc)

1. **USDC approve**: Owner wallet allows vault to spend USDC
2. **createProject**: 3 USDC locked in `escrowBalance`
3. **recordTestResult**: Tester wallet posts score + severity
4. **Smart contract logic**:
   ```solidity
   if (score >= minScore) {
     // PASS: move 3% from escrow to rewards
     escrowBalance -= 0.09 USDC
     rewardBalance += 0.09 USDC
   } else {
     // FAIL: move 3% from escrow to bounty pool
     escrowBalance -= 0.09 USDC
     bountyPoolBalance += 0.09 USDC
   }
   ```

### Off-Chain (LUPIN Backend)

1. Loads 10 exploits from DB (jailbreaks, prompt injections)
2. Sends each to target LLM via OpenRouter
3. Analyzes responses:
   - ✅ Blocked: "I cannot help with that..."
   - ❌ Broken: Model gave harmful content
4. Computes: `score = (blocked / total) × 100`
5. Signs transaction from tester wallet
6. Calls `recordTestResult(projectId, score, criticalCount)`
7. UI refreshes with new balances

## Demo Script

> "We built a system where LLM safety promises become real financial commitments on Arc.
> 
> 1. I'll create a Safety Vault with 3 USDC as collateral.
> 2. I set a rule: if my model scores above 85% on jailbreak tests, I earn a reward. Below that, funds go to a bug bounty pool.
> 3. LUPIN runs 10 adversarial prompts against the model.
> 4. The score is automatically recorded on Arc, and USDC moves between escrow, rewards, and bounty pool based on the results.
> 5. Everything is transparent on the blockchain – you can verify the test tx, the score, and the fund movements on ArcScan.
>
> This showcases programmable USDC logic on Arc: stablecoins aren't just transferred; they're governed by real-world safety conditions enforced on-chain."

## Troubleshooting

### "Insufficient funds" in MetaMask
- Make sure you're on **Arc Network Testnet** (chain ID 5042002)
- Get testnet USDC from: https://faucet.circle.com/

### "Arc client not configured" in backend
- Check `backend/.env` has:
  - `ARC_VAULT_CONTRACT_ADDRESS=0xC589...80b1`
  - `ARC_TESTER_PRIVATE_KEY=0x...`

### Project creation stuck
- Check MetaMask popup (might be hidden behind browser windows)
- Check console for errors
- Verify wallet is on Arc Testnet

### Tests fail with "API key invalid"
- Set your OpenRouter API key in **SETTINGS** tab first
- Or use the `OPENROUTER_KEY` from backend `.env` for testing

## Key Files

- **Contract**: `contracts/LupinSafetyVault.sol`
- **Deploy**: `scripts/deploy-lupin-vault.js` + `scripts/setup-project.js`
- **Backend Arc Client**: `backend/app/services/arc_client.py`
- **Frontend**: `frontend/src/components/SafetyVaultTab.tsx`
- **Projects Router**: `backend/app/routers/projects.py`

## Alternative RPC Endpoints

If `https://rpc.testnet.arc.network` is slow/flaky, update `.env`:

```env
# Try Blockdaemon
ARC_RPC_URL=https://rpc.blockdaemon.testnet.arc.network

# Or DRPC
ARC_RPC_URL=https://rpc.drpc.testnet.arc.network

# Or QuickNode
ARC_RPC_URL=https://rpc.quicknode.testnet.arc.network
```

Then restart backend and use the corresponding Hardhat network:

```bash
npx hardhat run scripts/deploy-lupin-vault.js --network arcTestnetBlockdaemon
```

