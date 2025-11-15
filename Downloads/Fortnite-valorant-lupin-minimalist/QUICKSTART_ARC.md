# 🚀 Arc Safety Vault - Quick Start

## What's New

LUPIN now includes **on-chain safety SLA tracking** via Arc blockchain:
- Projects deposit USDC as escrow
- Automated safety tests run against LLM models
- Smart contract applies rewards (score ≥ threshold) or penalties (score < threshold)
- Project owners withdraw earned rewards
- Researchers claim bounties from penalty pool

## 5-Minute Setup (MVP Mode)

### 1. Install Dependencies ✅ Already Done

```bash
# Backend
cd backend
python3 -m pip install -r requirements.txt
# ✅ Installed: web3, eth-account, aiohttp

# Frontend
cd frontend
npm install
# ✅ Already installed
```

### 2. Start Services (Works Without Arc)

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3. View Arc Vault Tab

1. Open http://localhost:5173
2. Click **"ARC VAULT"** tab
3. You'll see: "No projects yet" (expected - no Arc deployment yet)

**This proves the UI integration works!**

## What Works Right Now (No Deployment)

✅ All endpoints registered and accessible:
- `GET /api/projects/` - Returns empty list
- `GET /api/projects/stats/summary` - Returns {"total_projects": 0}

✅ UI fully functional:
- Project list view (empty state)
- Create project modal (shows wallet integration placeholder)
- All styling and navigation works

✅ Backend ready:
- Arc client initializes (read-only mode without config)
- All routes respond correctly
- Database migrations work

## Next Steps for Full Deployment

### Step 1: Deploy Smart Contract

See `ARC_DEPLOYMENT.md` for detailed instructions.

**Quick version:**
```bash
# Using Remix IDE (easiest)
1. Copy contracts/LupinSafetyVault.sol to Remix
2. Compile with Solidity 0.8.20
3. Deploy with USDC address
4. Copy deployed address
5. Call setTester() with backend tester address
```

### Step 2: Configure Backend

Create `backend/.env`:

```env
ARC_RPC_URL=https://your-arc-rpc.com
ARC_CHAIN_ID=123456
ARC_USDC_ADDRESS=0xUSDCAddress
ARC_VAULT_CONTRACT_ADDRESS=0xDeployedVaultAddress
ARC_TESTER_PRIVATE_KEY=0xYourTesterKey

# Keep existing keys
OPENROUTER_KEY=sk-or-v1-...
```

### Step 3: Test Backend Connection

```bash
cd backend
python3 -c "from app.services.arc_client import arc_client; print('✓ Connected' if arc_client else '✗ Not configured')"
```

### Step 4: Create First Project

**Option A: Via Remix (Manual)**
```
1. Call vault.createProject(90, 500, 500, 100000000)
   - minScore: 90
   - payoutRateBps: 500 (5%)
   - penaltyRateBps: 500 (5%)
   - initialDeposit: 100000000 (100 USDC with 6 decimals)
   
2. Get projectId from event logs

3. Register in backend:
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "onchain_project_id": 1,
    "owner_address": "0xYourAddress",
    "name": "Test Project",
    "target_model": "gpt-4"
  }'
```

### Step 5: Run First Safety Test

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-or-v1-...",
    "max_exploits": 20
  }'
```

This will:
- Test 20 exploits against your model
- Calculate safety score
- Record on-chain via smart contract
- Return transaction hash

## Understanding the System

### Reward Flow (Good Safety Score)

```
Before Test:
├── Escrow: 100 USDC
├── Rewards: 0 USDC
└── Bounty Pool: 0 USDC

Run Test → Score: 95/100 (≥ 90 threshold)

After Test:
├── Escrow: 95 USDC (100 - 5)
├── Rewards: 5 USDC (5% of 100) ← Owner can withdraw
└── Bounty Pool: 0 USDC
```

### Penalty Flow (Poor Safety Score)

```
Before Test:
├── Escrow: 100 USDC
├── Rewards: 0 USDC
└── Bounty Pool: 0 USDC

Run Test → Score: 75/100 (< 90 threshold)
          → Critical failures: 3

After Test:
├── Escrow: 90 USDC (100 - 10)
├── Rewards: 0 USDC
└── Bounty Pool: 10 USDC (5% * 2 for criticals) ← For researchers
```

### Critical Count Doubling

If ANY high/critical severity exploits succeed:
```
Base penalty = 5% of escrow
With criticals = 10% of escrow (doubled)
```

## API Examples

### List Projects

```bash
curl http://localhost:8000/api/projects/
```

Response:
```json
[
  {
    "id": "uuid...",
    "onchain_project_id": 1,
    "name": "Test Project",
    "owner_address": "0x...",
    "target_model": "gpt-4",
    "escrow_balance": 95000000,
    "reward_balance": 5000000,
    "last_score": 95,
    "avg_score": 92,
    "test_count": 3
  }
]
```

### Get Project Details

```bash
curl http://localhost:8000/api/projects/PROJECT_ID
```

### Run Safety Test

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-or-v1-YOUR_KEY",
    "max_exploits": 50
  }'
```

Response:
```json
{
  "project_id": "uuid...",
  "onchain_project_id": 1,
  "score": 88,
  "critical_count": 2,
  "new_exploit_hash": "0x0000...",
  "tx_hash": "0xabc123...",
  "summary": {
    "total_tests": 50,
    "successful_exploits": 6,
    "blocked_exploits": 44,
    "safety_score": 88.0
  }
}
```

## Troubleshooting

### "Arc client not initialized"

This is **normal** before deployment. The system works in read-only mode.

To enable full functionality:
1. Deploy contract to Arc
2. Set environment variables
3. Restart backend

### "Cannot import arc_client"

Run: `python3 -m pip install web3 eth-account`

### Frontend shows empty projects

This is **expected** before:
1. Contract is deployed
2. Projects are created on-chain
3. Projects are registered via backend

## What to Do Next

### For Testing (No Arc Deployment)
- Explore existing features (Lupin chat, Exploit tracker, Model testing)
- Familiarize yourself with UI
- Read `lupin_arc_build_spec.md` to understand the system

### For Production (Full Arc Integration)
1. Follow `ARC_DEPLOYMENT.md` step by step
2. Deploy contract to Arc testnet
3. Configure backend environment variables
4. Create test project on-chain
5. Register project via backend API
6. Run first safety test
7. Verify balances update on-chain

### For Development (Extending Features)
- Add wallet integration to frontend (WalletConnect)
- Implement bounty management UI
- Add historical charts for safety scores
- Build automated test scheduling

## Getting Help

- **Spec**: `lupin_arc_build_spec.md` - Single source of truth
- **Deployment**: `ARC_DEPLOYMENT.md` - Step-by-step deployment
- **Integration**: `ARC_INTEGRATION_README.md` - API docs and architecture
- **Summary**: `IMPLEMENTATION_SUMMARY.md` - What was built

## Success Criteria

You've successfully integrated Arc Safety Vault when:

✅ Backend starts without errors  
✅ Frontend shows Arc Vault tab  
✅ Projects API returns 200 (even if empty)  
🔄 Contract deployed to Arc  
🔄 First project created on-chain  
🔄 First test recorded on-chain  
🔄 Balances update after test  

**Current status: 3/7 complete** (Backend + Frontend ready, deployment pending)

