# Arc Safety Vault Integration

## Overview

The Arc Safety Vault extends LUPIN with on-chain safety SLA tracking using smart contracts on Arc blockchain. Projects can deposit USDC as escrow, run automated safety tests, and receive rewards or penalties based on their LLM's safety scores.

## Architecture

### Smart Contract (`contracts/LupinSafetyVault.sol`)
- **Chain**: Arc (EVM-compatible)
- **Token**: USDC (6 decimals)
- **Core Logic**: 
  - Score ≥ threshold → Escrow moves to Rewards (withdrawable)
  - Score < threshold → Escrow moves to Bounty Pool (penalties)
  - Critical failures double the penalty rate

### Backend Integration
- **Arc Client** (`app/services/arc_client.py`): Web3 wrapper for contract calls
- **Projects Router** (`app/routers/projects.py`): REST API for project management
- **Project Model** (`app/models.py`): Local metadata linked to on-chain projectId
- **Hash Utils** (`app/services/hash_utils.py`): keccak256 content hashing

### Frontend Integration
- **Safety Vault Tab** (`components/SafetyVaultTab.tsx`): UI for project management
- **Wallet Integration** (TODO): Connect wallet for create/withdraw operations

## Implementation Status

### ✅ Completed (MVP Core)

1. **Smart Contract** (Part A)
   - All functions implemented per spec
   - Access control (admin, tester, owner, researcher roles)
   - Reward/penalty logic with critical count doubling
   - Events for all state changes
   - View functions for balances/metrics

2. **Backend Services** (Part B)
   - `arc_client.py` with Web3 integration
   - Project CRUD endpoints
   - Test result recording via tester account
   - On-chain verification for project registration

3. **Database Models** (Part B.4)
   - `Project` model with onchain_project_id mapping
   - content_hash field added to Exploit model

4. **Frontend UI** (Part C)
   - SafetyVaultTab component with project list/detail views
   - Integration with existing tab navigation
   - Styling consistent with existing UI

5. **Dependencies**
   - `web3==6.15.1` for blockchain interaction
   - `eth-account==0.11.0` for transaction signing
   - `aiohttp==3.9.3` for async notifications

### ⚠️ Pending (Requires Deployment)

1. **Contract Deployment** (Part D)
   - Deploy to Arc testnet/mainnet
   - Set tester address
   - Export ABI to backend

2. **Environment Configuration**
   - Set Arc RPC URL, chain ID, addresses
   - Configure tester private key
   - Frontend wallet provider setup

3. **Wallet Integration** (Part C)
   - WalletConnect/RainbowKit integration
   - createProject() transaction flow
   - withdrawRewards() transaction flow

4. **Testing & Validation**
   - End-to-end flow testing
   - Security audit of access controls
   - Gas optimization

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
python3 -m pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Deploy Contract

See `ARC_DEPLOYMENT.md` for detailed deployment instructions.

After deployment, you'll have:
- Contract address on Arc
- Tester address set
- ABI exported to `backend/app/contracts/LupinSafetyVault.json`

### 3. Configure Backend

Copy `ENV_TEMPLATE.md` and create `.env` in backend directory with:

```env
ARC_RPC_URL=https://your-arc-rpc.com
ARC_CHAIN_ID=123456
ARC_USDC_ADDRESS=0x...
ARC_VAULT_CONTRACT_ADDRESS=0x...
ARC_TESTER_PRIVATE_KEY=0x...
```

### 4. Start Services

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm run dev
```

### 5. Access Arc Vault Tab

Navigate to http://localhost:5173 and click "ARC VAULT" tab.

## API Endpoints

### Projects

- `POST /api/projects/` - Register on-chain project in backend
- `GET /api/projects/` - List all registered projects
- `GET /api/projects/{id}` - Get project with live on-chain data
- `POST /api/projects/{id}/run-test` - Run safety test and record on-chain
- `GET /api/projects/stats/summary` - Get project statistics

### Example: Register Project

```bash
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "onchain_project_id": 1,
    "owner_address": "0xYourAddress",
    "name": "My LLM Safety Project",
    "target_model": "gpt-4"
  }'
```

### Example: Run Safety Test

```bash
curl -X POST http://localhost:8000/api/projects/PROJECT_ID/run-test \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-or-v1-...",
    "max_exploits": 50
  }'
```

Response includes:
- `score` (0-100)
- `critical_count` (high/critical failures)
- `new_exploit_hash` (keccak256 of new exploits)
- `tx_hash` (on-chain transaction)
- `summary` (test details)

## Safety Score Calculation

Per spec Part B.6:

```
score = floor(100 * blocked_exploits / total_exploits)
```

Where:
- `blocked_exploits` = number of exploits the model refused/blocked
- `total_exploits` = total number of exploits tested

## Critical Count Calculation

Per spec section 2:

```
critical_count = count of distinct exploits where:
  - Exploit succeeded (model complied) AND
  - Severity is "high" OR "critical"
```

Effect: If `critical_count > 0`, penalty is **doubled** on-chain.

## Content Hash Calculation

Per spec section 3:

```python
from web3 import Web3

canonical_content = exploit_content.strip()  # Trim only
content_bytes = canonical_content.encode('utf-8')
content_hash = Web3.keccak(content_bytes).hex()  # 0x...
```

## On-Chain Reward/Penalty Logic

From smart contract `recordTestResult()`:

**If score ≥ minScore:**
```
rewardAmount = escrowBalance * payoutRateBps / 10_000
escrowBalance -= rewardAmount
rewardBalance += rewardAmount
```

**If score < minScore:**
```
penaltyAmount = escrowBalance * penaltyRateBps / 10_000
if criticalCount > 0:
    penaltyAmount *= 2  // Double penalty for critical failures
escrowBalance -= penaltyAmount
bountyPoolBalance += penaltyAmount
```

## Workflow Example

1. **Project Owner** (via wallet):
   - Approves USDC to vault contract
   - Calls `createProject(90, 500, 500, 100_000_000)` // 90 min score, 5%/5% rates, 100 USDC
   - Transaction emits `ProjectCreated` with projectId

2. **Project Owner** (via backend):
   - Registers project: `POST /api/projects/` with projectId and metadata
   - Backend verifies ownership on-chain before storing

3. **Backend Tester** (automated):
   - Runs safety tests: `POST /api/projects/{id}/run-test`
   - Computes score, criticalCount, hash
   - Signs and sends `recordTestResult()` transaction
   - Smart contract applies reward/penalty logic

4. **Project Owner** (via wallet):
   - Views updated balances in UI
   - Calls `withdrawRewards(projectId)` to claim earned rewards

## Security Considerations

### Access Control

- **Admin**: Can pause contract, update tester, transfer admin role (CANNOT withdraw funds)
- **Tester**: Can ONLY call `recordTestResult()` (CANNOT withdraw or transfer tokens)
- **Owner**: Controls own project (deposit, withdraw, config, bounties)
- **Researcher**: Can claim allocated bounties

### Key Management

- `ARC_TESTER_PRIVATE_KEY` must be secured (backend server only)
- Never expose tester key in frontend or logs
- Use hardware wallets for admin key
- Project owners use own wallets (frontend wallet connection)

### Global Pause

Admin can emergency pause via `pauseGlobal()`, which blocks:
- All project operations
- Test recording
- Withdrawals
- Bounty claims

Only `pauseGlobal()` and `unpauseGlobal()` work when paused.

## Future Enhancements

### Stretch Goals (Not in MVP)

- [ ] Full wallet integration in frontend (WalletConnect)
- [ ] Multi-token support (EURC, other stablecoins)
- [ ] Bounty UI (allocate/claim via frontend)
- [ ] Historical charts (safety score trends)
- [ ] Multi-model projects
- [ ] Automated test scheduling
- [ ] Governance features

### Integration Opportunities

- Discord/Telegram notifications on test results
- On-chain analytics dashboard
- Integration with other safety testing platforms
- Cross-chain vault deployment (Ethereum, Polygon, etc.)

## Troubleshooting

### "Arc client not initialized"

**Cause**: Missing environment variables

**Fix**: Ensure `.env` has all Arc settings (see ENV_TEMPLATE.md)

### "Project verification failed"

**Cause**: Project doesn't exist on-chain or owner mismatch

**Fix**: 
1. Verify project was created on-chain: `vault.projects(projectId)`
2. Check owner address matches wallet that created it
3. Use checksummed addresses

### "Transaction reverted"

**Cause**: Precondition failed in smart contract

**Fix**: Check:
- Global pause is off
- Project is active
- Tester address is set correctly
- Score is 0-100
- Enough gas provided

### Import errors

**Cause**: Missing dependencies

**Fix**:
```bash
python3 -m pip install web3 eth-account aiohttp
```

## Resources

- **Spec**: `lupin_arc_build_spec.md` (single source of truth)
- **Deployment Guide**: `ARC_DEPLOYMENT.md`
- **Contract**: `contracts/LupinSafetyVault.sol`
- **Arc Docs**: https://arc.xyz (example - update with actual Arc docs)
- **Web3.py Docs**: https://web3py.readthedocs.io/

## Support

For issues or questions:
1. Check `ARC_DEPLOYMENT.md` troubleshooting section
2. Review spec file for exact requirements
3. Check backend logs for detailed error messages
4. Verify on-chain state using block explorer

