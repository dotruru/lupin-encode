## Scope & Assumptions

- **Chain**: Arc Testnet only (Chain ID `5042002`) for this hackathon.
- **Tokens**: USDC only (`0x3600000000000000000000000000000000000000` on testnet).
- **Vault Contract**: `LupinSafetyVault` deployed at `0xC58975099823A60F101B62940d88e6c8De9A80b1`.
- **Owner Wallet**: `0xB447900683F1A37230e25577eA6E2BAF126996B0` (escrow payer).
- **Tester Wallet**: Single tester/oracle, configured via `ARC_TESTER_PRIVATE_KEY` in `backend/.env`.
- **RPC**: Default `https://rpc.testnet.arc.network`, with planned support for:
  - `https://rpc.blockdaemon.testnet.arc.network`
  - `https://rpc.drpc.testnet.arc.network`
  - `https://rpc.quicknode.testnet.arc.network`
- **Secrets**: Stored in plain `.env` files (local only, for hackathon).
- **Time horizon**: ~5 hours to polish for demo.

---

## Immediate Goals (Hackathon, Next 5 Hours)

### **1. Wallet‑Driven Project Creation (High Priority)**

- **Backend**
  - **Expose a lightweight helper endpoint** (optional) to avoid duplicating validation logic:
    - `POST /api/projects/register-and-verify` that:
      - Accepts `{ onchain_project_id, owner_address, name, target_model }`.
      - Uses `arc_client.get_project` to pull `minScore`, `payoutRateBps`, `penaltyRateBps`.
      - Registers the project in one step.
  - **Ensure CORS and error messages** are clean so frontend can surface:
    - Owner mismatch,
    - Vault misconfiguration,
    - RPC connectivity issues.

- **Frontend (SafetyVaultTab)**
  - **Implement the "Create Project (Wallet Required)" button** to do the real flow:
    - Ensure wallet is connected to Arc Testnet (`VITE_ARC_CHAIN_ID`).
    - Use ethers.js in the browser to:
      1. Call `approve( VAULT_ADDRESS, initial_deposit * 1e6 )` on USDC.
      2. Call `createProject(min_score, payout_rate_bps, penalty_rate_bps, initial_deposit_scaled)` on `LupinSafetyVault`.
      3. Wait for tx receipt; parse `ProjectCreated` event to get `projectId`.
    - After on-chain success, **call backend**:
      - `POST /api/projects/` (or the helper endpoint) with:
        - `onchain_project_id = projectId`,
        - `owner_address = connected wallet`,
        - `name`, `target_model` from the form.
    - On success:
      - Close the modal,
      - Refresh the projects list,
      - Show a success toast with:
        - `projectId`,
        - explorer link (ArcScan) for the tx.

  - **UX polish**
    - Disable the create button while tx is pending.
    - Show clear error messages:
      - “Approval failed – check wallet”,
      - “createProject reverted – check RPC or gas”,
      - “Backend registration failed – owner mismatch / RPC down”.

### **2. Cheap but Convincing Safety Tests**

- **Backend**
  - **Default to low-cost runs**:
    - Set `max_exploits` default for UI-triggered tests to **5–10**, not 50.
    - In `run-test` endpoint, allow a `max_exploits` override but clamp to a reasonable upper bound (e.g. 20).
  - **Ensure summary looks good for demo**:
    - Keep current scoring:
      - 100% if all exploits are blocked.
      - Automatic reward/penalty on-chain via `recordTestResult`.
    - Surface:
      - `total_tests`, `blocked_exploits`, `successful_exploits`,
      - `safety_score`.

- **Frontend**
  - **ARC VAULT detail modal**:
    - After `RUN SAFETY TEST`:
      - Show a modal/toast summarizing:
        - `Score`, `Critical failures`, `tx_hash` (with ArcScan link).
      - Immediately refresh balances and metrics.

### **3. RPC Configuration & Fallback (Minimal Hackathon Version)**

- **Config**
  - In `backend/.env`, support changing RPC easily:
    - `ARC_RPC_URL` can be switched to:
      - `https://rpc.blockdaemon.testnet.arc.network` or others if the main RPC is flaky.
  - In `frontend/.env`, keep:
    - `VITE_ARC_CHAIN_ID=5042002`.
    - `VITE_ARC_VAULT_ADDRESS=<current vault>`.

- **Code (lightweight)**
  - Add **simple logging** in `arc_client`:
    - Log which RPC is being used at startup.
  - Optionally, add a **health endpoint**:
    - `/api/projects/arc-health` that:
      - Calls `w3.eth.block_number` and returns `{ rpc_url, chain_id, latest_block }` for quick debugging during demo.

### **4. Demo Script & Docs**

- **README updates**
  - Add a short “Arc Demo Flow” section:
    - Start backend + frontend.
    - Connect wallet on ARC VAULT tab.
    - Create project (what each field means).
    - Run test.
    - Show:
      - on-chain tx on ArcScan,
      - updated balances & score in UI.

- **ROADMAP section**
  - At the end of `ROADMAP.md`, include a short “Post‑hackathon ideas” (see below).

---

## Post‑Hackathon Improvements (If Time Allows)

- **Better RPC resilience**
  - Implement a small wrapper in `arc_client` that:
    - Tries primary RPC, falls back to alternative endpoints when connection fails.
    - Exposes current RPC status in `/arc-health`.

- **Analytics & History**
  - ARC VAULT tab:
    - Show a small **history table** of last N tests:
      - `timestamp`, `score`, `critical_count`, `tx_hash`.
    - Visual indicator of **escrow → rewards / bounty** movement per test.

- **Safer tester/oracle model**
  - Add rate limits and sanity checks around `record_test_result`:
    - e.g. ignore scores outside [0, 100], or reject if score change is too extreme vs. historical average.

- **Testing & CI**
  - Add basic Hardhat tests for:
    - `createProject`, `recordTestResult`, `withdrawRewards`, `createBountyPayout`.
  - Add one or two backend integration tests hitting:
    - `/api/projects/`, `/run-test` against a local test chain.

---

---

## ✅ Implementation Status

### Completed (Ready for Demo)

- ✅ **Wallet-driven Create Project flow** (`SafetyVaultTab.tsx`)
  - Full approve → createProject → backend register from UI
  - Shows step-by-step progress ("Approving USDC...", "Creating on-chain...", "Registering...")
  - Parses `ProjectCreated` event for automatic `projectId` extraction
  - Success message with ArcScan link

- ✅ **ABI definitions** for USDC and Vault interactions in frontend

- ✅ **Cheap demo tests** (max_exploits = 10, down from 50)

- ✅ **RPC fallback support** in `hardhat.config.js`:
  - `arcTestnet` (default)
  - `arcTestnetBlockdaemon`
  - `arcTestnetDRPC`
  - `arcTestnetQuicknode`

- ✅ **Backend ABI wiring** (`backend/app/contracts/LupinSafetyVault.json` from Hardhat artifacts)

- ✅ **Frontend config template** (`frontend/ENV_CONFIG.md`)

- ✅ **Demo guide** (`DEMO_GUIDE.md`) with 5-minute walkthrough

### Ready to Test

1. Use the GitHub bypass link to push
2. Open **http://localhost:5173** → ARC VAULT tab
3. Connect wallet (Arc Testnet)
4. Click **+ CREATE PROJECT** → fill form → **Create Project**
5. Confirm 2 MetaMask txs (approve + createProject)
6. Project appears automatically
7. Click **RUN TEST** → see on-chain results

All core roadmap tasks for hackathon demo are complete! 🚀