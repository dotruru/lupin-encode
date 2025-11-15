# LUPIN Safety Vault on Arc – Build Specification

This document is for **Cursor + AI coders**.  
It is the **single source of truth** for turning LUPIN into an Arc-based safety SLA system.

It is split into parts:

- **Part A – Smart Contract (Arc / Solidity)**  
- **Part B – Backend Integration (FastAPI / Python)**  
- **Part C – Frontend Integration (React / Vite)**  
- **Part D – Deployment & Configuration**  
- **Part E – MVP Scope vs Stretch Goals**

---

## Part A – Smart Contract on Arc (`contracts/LupinSafetyVault.sol`)

### A1. Purpose & Constraints

**Purpose**

Implement a single Solidity contract on **Arc** that:

- Custodies **USDC** (MVP) and later **EURC** for multiple LLM projects.
- Tracks per-project **escrow**, **reward**, and **bounty** balances.
- Accepts **test results** from the LUPIN backend (tester/oracle address).
- Applies **deterministic rules**:
  - If safety score ≥ threshold → move some escrow → rewards.
  - If safety score < threshold → move some escrow → bounty pool (penalty).
- Allows owners to **withdraw rewards** and allocate **bounties** to researchers.

**Constraints / Assumptions**

- Chain: **Arc** (EVM-compatible).
- Token: **USDC only for MVP** (6 decimal ERC-20).  
  - Assume `usdc` behaves like a standard ERC-20.
  - All balances are stored in **raw token units** (no extra scaling).
- No external oracle frameworks (no Chainlink).  
  - The **LUPIN backend is the oracle** using a dedicated `tester` address.
- No upgradable proxy patterns for MVP – simple, single contract deployment.
- All logic and formulas below are **final**, not “examples”.

---

### A2. Roles & Access Control

You MUST implement access checks exactly like this:

**Roles**

- `admin`
  - Set initially to deployer.
  - Can:
    - change `admin` (ownership transfer),
    - update `tester` address,
    - emergency-pause the **entire contract** (not per-project).
  - **Cannot** withdraw any project funds.

- `tester` (LUPIN backend oracle)
  - EOA or contract address controlled by backend.
  - Can **only** call `recordTestResult(...)`.
  - **Cannot** withdraw or transfer tokens directly.

- `owner` (project owner)
  - Per-project address specified on creation.
  - Can:
    - create projects,
    - deposit escrow into own project,
    - update project config,
    - pause/unpause own project,
    - withdraw rewards from own project,
    - allocate bounties from own project’s bounty pool.

- `researcher`
  - Any address that receives bounty allocations.
  - Can:
    - claim their allocated bounty for a given project.

**Global invariants**

- `admin` cannot seize or redirect project funds.
- `tester` cannot directly move tokens, other than via **the deterministic logic inside `recordTestResult`**.
- Only `owner` of a project can:
  - update its config,
  - withdraw its rewards,
  - allocate bounties from its bounty pool.

---

### A3. Types & Data Structures

Use these logical types (you can map to native Solidity ints):

- `ProjectId` – `uint256`
- `Score` – `uint8` (0–100)
- `BasisPoints` – `uint16` (0–10_000)

**Project Struct**

```text
struct Project {
  address owner;           // project owner
  address token;           // token contract address (USDC for MVP)

  uint8   minScore;        // safety threshold (0–100)
  uint16  payoutRateBps;   // reward rate in basis points (0–10_000)
  uint16  penaltyRateBps;  // penalty rate in basis points (0–10_000)

  uint256 escrowBalance;       // locked collateral
  uint256 rewardBalance;       // accumulated rewards (withdrawable)
  uint256 bountyPoolBalance;   // reserved for bounties

  uint8   lastScore;       // last safety score
  uint8   avgScore;        // simple running average of scores (rounded)
  uint32  testCount;       // number of tests recorded
  uint64  lastTestTime;    // unix timestamp of last test

  bool    active;          // project is active (true) or paused (false)
}
```

**Bounty Allocations**

```text
mapping(ProjectId => mapping(address => uint256)) bounties;
```

For each `(projectId, researcher)`, track how much they can claim from the bounty pool.

**Global State Variables**

```text
address public admin;
address public tester;       // oracle wallet address (LUPIN backend)
IERC20 public usdc;          // USDC token contract (MVP; EURC later)
uint256 public nextProjectId;
bool public globalPaused;
mapping(uint256 => Project) public projects;
mapping(uint256 => mapping(address => uint256)) public bounties;
```

---

### A4. Events (Exact Shape)

You MUST emit these events with at least these arguments:

- `event ProjectCreated(uint256 indexed projectId, address indexed owner, address indexed token, uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps, uint256 initialDeposit);`

- `event EscrowDeposited(uint256 indexed projectId, address indexed from, uint256 amount);`

- `event TestResultRecorded(
    uint256 indexed projectId,
    uint8 score,
    uint8 lastScore,
    uint8 avgScore,
    uint32 testCount,
    uint8 criticalCount,
    uint256 rewardAmount,
    uint256 penaltyAmount,
    bytes32 newExploitHash
  );`

- `event RewardsWithdrawn(uint256 indexed projectId, address indexed owner, uint256 amount);`

- `event BountyCreated(uint256 indexed projectId, address indexed researcher, uint256 amount, bytes32 exploitHash);`

- `event BountyClaimed(uint256 indexed projectId, address indexed researcher, uint256 amount);`

- `event ProjectConfigUpdated(uint256 indexed projectId, uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps);`

- `event TesterUpdated(address indexed oldTester, address indexed newTester);`

- `event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);`

- `event ProjectPaused(uint256 indexed projectId);`

- `event ProjectUnpaused(uint256 indexed projectId);`

- `event GlobalPaused();`
- `event GlobalUnpaused();`

---

### A5. Function Specifications

For each function: **Caller, Inputs, Preconditions, State changes, Emits, Reverts if**.

#### A5.1. `constructor(address _usdc)`

- **Caller**: deployer (EVM).
- **Inputs**:
  - `_usdc` – address of USDC ERC-20.
- **Behavior**:
  - `admin = msg.sender`
  - `tester = msg.sender` (can be updated later)
  - `usdc = IERC20(_usdc)`
  - `nextProjectId = 1`
  - `globalPaused = false`
- **Emits**: none.

---

#### A5.2. `setAdmin(address newAdmin)`

- **Caller**: `admin` only.
- **Inputs**:
  - `newAdmin` – new admin address (non-zero).
- **Preconditions**:
  - `newAdmin != address(0)`
- **State changes**:
  - `admin` updated.
- **Emits**:
  - `AdminUpdated(oldAdmin, newAdmin)`
- **Reverts if**:
  - `msg.sender != admin`
  - `newAdmin == address(0)`

---

#### A5.3. `setTester(address newTester)`

- **Caller**: `admin` only.
- **Inputs**:
  - `newTester` – new tester/oracle address (non-zero).
- **Preconditions**:
  - `newTester != address(0)`
- **State changes**:
  - `tester` updated.
- **Emits**:
  - `TesterUpdated(oldTester, newTester)`
- **Reverts if**:
  - `msg.sender != admin`
  - `newTester == address(0)`

---

#### A5.4. `pauseGlobal()` and `unpauseGlobal()`

- **Caller**: `admin` only.
- **pauseGlobal**
  - Sets `globalPaused = true`.
  - Emits `GlobalPaused()`.
- **unpauseGlobal**
  - Sets `globalPaused = false`.
  - Emits `GlobalUnpaused()`.
- **Reverts if**:
  - `msg.sender != admin`.

All state-changing functions below MUST revert if `globalPaused == true` (except the pause/unpause themselves).

---

#### A5.5. `createProject(uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps, uint256 initialDeposit)`

- **Caller**: any EOA (future project owner).
- **Inputs**:
  - `minScore` – 0–100.
  - `payoutRateBps` – basis points (0–10_000).
  - `penaltyRateBps` – basis points (0–10_000).
  - `initialDeposit` – amount of USDC to deposit as escrow (in token units).
- **Preconditions**:
  - `globalPaused == false`.
  - `minScore <= 100`.
  - `payoutRateBps <= 10_000`.
  - `penaltyRateBps <= 10_000`.
  - `initialDeposit > 0`.
- **Token transfer**:
  - Caller MUST have approved `initialDeposit` USDC beforehand.
  - Contract MUST call `usdc.transferFrom(msg.sender, address(this), initialDeposit)` and require success.
- **State changes**:
  - `projectId = nextProjectId; nextProjectId += 1`.
  - Create `Project` with:
    - `owner = msg.sender`
    - `token = address(usdc)`
    - `minScore = minScore`
    - `payoutRateBps = payoutRateBps`
    - `penaltyRateBps = penaltyRateBps`
    - `escrowBalance = initialDeposit`
    - `rewardBalance = 0`
    - `bountyPoolBalance = 0`
    - `lastScore = 0`
    - `avgScore = 0`
    - `testCount = 0`
    - `lastTestTime = 0`
    - `active = true`
- **Emits**:
  - `ProjectCreated(...)`
- **Reverts if**:
  - Any precondition fails.
  - `usdc.transferFrom` fails/returns false.

---

#### A5.6. `depositEscrow(uint256 projectId, uint256 amount)`

- **Caller**: `projects[projectId].owner` only.
- **Inputs**:
  - `projectId`, `amount`
- **Preconditions**:
  - `globalPaused == false`.
  - `projects[projectId].owner != address(0)` (project exists).
  - `projects[projectId].active == true`.
  - `amount > 0`.
  - `msg.sender == project.owner`.
- **Token transfer**:
  - `usdc.transferFrom(msg.sender, address(this), amount)`
- **State changes**:
  - `project.escrowBalance += amount`.
- **Emits**:
  - `EscrowDeposited(projectId, msg.sender, amount)`
- **Reverts if**:
  - Any precondition fails.
  - `usdc.transferFrom` fails.

---

#### A5.7. `updateProjectConfig(uint256 projectId, uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps)`

- **Caller**: `projects[projectId].owner` only.
- **Inputs**:
  - `projectId`, `minScore`, `payoutRateBps`, `penaltyRateBps`.
- **Preconditions**:
  - `globalPaused == false`.
  - `project exists`.
  - `msg.sender == project.owner`.
  - `minScore <= 100`.
  - `payoutRateBps <= 10_000`.
  - `penaltyRateBps <= 10_000`.
- **State changes**:
  - Update config fields on project.
- **Emits**:
  - `ProjectConfigUpdated(projectId, minScore, payoutRateBps, penaltyRateBps)`
- **Reverts if**:
  - Any precondition fails.

---

#### A5.8. `pauseProject(uint256 projectId)` / `unpauseProject(uint256 projectId)`

- **Caller**: `projects[projectId].owner` OR `admin`.
- **Preconditions**:
  - `globalPaused == false` (for pause/unpause calls themselves).
  - `project exists`.
- **State changes**:
  - `pauseProject`: set `project.active = false`.
  - `unpauseProject`: set `project.active = true`.
- **Emits**:
  - `ProjectPaused(projectId)` or `ProjectUnpaused(projectId)`.
- **Reverts if**:
  - `msg.sender` is neither `admin` nor `project.owner`.

---

#### A5.9. `recordTestResult(uint256 projectId, uint8 score, uint8 criticalCount, bytes32 newExploitHash)`

This is the **core oracle entry point**.

- **Caller**: `tester` only.
- **Inputs**:
  - `projectId`
  - `score` – 0–100
  - `criticalCount` – number of critical failures (0–255)
  - `newExploitHash` – `bytes32` (hash or 0x0)
- **Preconditions**:
  - `globalPaused == false`.
  - `msg.sender == tester`.
  - `project exists`.
  - `project.active == true`.
  - `score <= 100`.
- **State updates (metrics)**:
  - `project.lastScore = score`.
  - Update `avgScore` as a simple running average:
    - If `testCount == 0`:
      - `avgScore = score`.
    - Else:
      - `avgScore = uint8( (uint256(project.avgScore) * project.testCount + score) / (project.testCount + 1) )`.
  - `project.testCount += 1`.
  - `project.lastTestTime = uint64(block.timestamp)`.

- **Stablecoin logic** (MVP – fixed formulas, no “optional” behavior):

  - Initialize:
    - `uint256 rewardAmount = 0;`
    - `uint256 penaltyAmount = 0;`

  1. **Reward when score passes**

     If `score >= project.minScore` AND `project.escrowBalance > 0`:

     - `rewardAmount = project.escrowBalance * project.payoutRateBps / 10_000;`
     - If `rewardAmount > project.escrowBalance`, set `rewardAmount = project.escrowBalance`.
     - `project.escrowBalance -= rewardAmount;`
     - `project.rewardBalance += rewardAmount;`

  2. **Penalty when score fails**

     If `score < project.minScore` AND `project.escrowBalance > 0`:

     - Base penalty:
       - `penaltyAmount = project.escrowBalance * project.penaltyRateBps / 10_000;`
     - If `criticalCount > 0`, double the penalty:
       - `penaltyAmount = penaltyAmount * 2;`
     - If `penaltyAmount > project.escrowBalance`, set `penaltyAmount = project.escrowBalance`.
     - `project.escrowBalance -= penaltyAmount;`
     - `project.bountyPoolBalance += penaltyAmount;`

  > Note: Only one of "score >= minScore" or "score < minScore" can happen; no overlap.

- **Emits**:
  - `TestResultRecorded(projectId, score, project.lastScore, project.avgScore, project.testCount, criticalCount, rewardAmount, penaltyAmount, newExploitHash)`
- **Reverts if**:
  - Any precondition fails.

---

#### A5.10. `withdrawRewards(uint256 projectId)`

- **Caller**: `projects[projectId].owner` only.
- **Preconditions**:
  - `globalPaused == false`.
  - `project exists`.
  - `msg.sender == project.owner`.
  - `project.rewardBalance > 0`.
- **Token transfer**:
  - `amount = project.rewardBalance`.
  - Set `project.rewardBalance = 0`.
  - Call `usdc.transfer(project.owner, amount)` and require success.
- **Emits**:
  - `RewardsWithdrawn(projectId, project.owner, amount)`
- **Reverts if**:
  - Any precondition fails.
  - Transfer fails.

---

#### A5.11. `createBountyPayout(uint256 projectId, address researcher, uint256 amount, bytes32 exploitHash)`

- **Caller**: `projects[projectId].owner` only.
- **Inputs**:
  - `projectId`, `researcher`, `amount`, `exploitHash`.
- **Preconditions**:
  - `globalPaused == false`.
  - `project exists`.
  - `msg.sender == project.owner`.
  - `researcher != address(0)`.
  - `amount > 0`.
  - `project.bountyPoolBalance >= amount`.
- **State changes**:
  - `project.bountyPoolBalance -= amount;`
  - `bounties[projectId][researcher] += amount;`
- **Emits**:
  - `BountyCreated(projectId, researcher, amount, exploitHash)`
- **Reverts if**:
  - Any precondition fails.

---

#### A5.12. `claimBounty(uint256 projectId)`

- **Caller**: `researcher` (any address).
- **Inputs**:
  - `projectId`
- **Preconditions**:
  - `globalPaused == false`.
  - `project exists`.
  - `pending = bounties[projectId][msg.sender] > 0`.
- **State changes**:
  - `bounties[projectId][msg.sender] = 0`.
- **Token transfer**:
  - `usdc.transfer(msg.sender, pending)`.
- **Emits**:
  - `BountyClaimed(projectId, msg.sender, pending)`
- **Reverts if**:
  - Any precondition fails.
  - Transfer fails.

---

### A6. View Functions (Optional But Recommended)

- `getProject(uint256 projectId) → full Project struct`
- `getBalances(uint256 projectId) → (escrow, reward, bountyPool)`
- `getMetrics(uint256 projectId) → (lastScore, avgScore, testCount, lastTestTime)`

These can be `view` functions returning relevant fields, to reduce frontend RPC complexity.

---

## Part B – Backend Integration (FastAPI / Python)

### B1. New Config & Environment

Extend `backend/app/config.py` to include:

- `ARC_RPC_URL`
- `ARC_CHAIN_ID`
- `ARC_USDC_ADDRESS`
- `ARC_VAULT_CONTRACT_ADDRESS` (LupinSafetyVault)
- `ARC_TESTER_PRIVATE_KEY` (backend’s oracle key)
- `ARC_TESTER_ADDRESS` (derived from key)
- (Optional) `ARC_GAS_PRICE` override, or dynamic estimation.

All read from `.env` or environment variables.

---

### B2. Dependencies

In `backend/requirements.txt`, ensure you add:

- `web3` (for Web3.py)
- Possibly `eth-account` if not pulled via web3.

After this, backend will have:

- `FastAPI` (already present),
- `SQLAlchemy` (already present),
- `web3.py` for Arc interaction.

---

### B3. New Service: `app/services/arc_client.py`

Create a new module to encapsulate ALL blockchain interaction.

Responsibilities:

1. Initialize Web3 client with `ARC_RPC_URL` and `ARC_CHAIN_ID`.
2. Load `LupinSafetyVault` ABI (from a JSON file in `backend/app/contracts/` or an inline constant).
3. Provide high-level functions:

**Functions**

- `get_project(project_id: int) -> dict`
  - Calls `vault.functions.projects(projectId).call()`.
  - Normalizes to Python dict: owner, token, minScore, balances, metrics, active.

- `create_project(owner_address: str, min_score: int, payout_rate_bps: int, penalty_rate_bps: int, initial_deposit: int) -> int`
  - **Important**: creation TX is sent by the **frontend wallet**, not backend.  
    - Backend only needs ABI for optional data checks.
  - For MVP: you may not need backend to create projects; do it via frontend.

- `record_test_result(project_id: int, score: int, critical_count: int, new_exploit_hash: bytes) -> str`
  - Signs and sends TX from `ARC_TESTER_PRIVATE_KEY`.
  - Returns transaction hash.
  - Must:
    - Construct tx with `from = ARC_TESTER_ADDRESS`,
    - set `chainId = ARC_CHAIN_ID`,
    - set gas/gasPrice (from node or config),
    - sign & send raw transaction,
    - wait for receipt optionally (or at least return tx hash).

- `get_balances(project_id: int) -> dict`
  - Wraps contract view calls to fetch escrow/reward/bounty.

- `get_metrics(project_id: int) -> dict`
  - Wraps contract view calls to fetch lastScore, avgScore, testCount, lastTestTime.

All exceptions should be wrapped in custom errors or logged clearly.

---

### B4. New DB Model: `Project` (Local Metadata)

In `backend/app/models.py`, add a `Project` ORM model (SQLite) to track mapping between your backend concepts and on-chain `projectId`.

**Fields (example)**:

- `id` – Primary key (local int).
- `onchain_project_id` – Int, unique, maps to Solidity `projectId`.
- `name` – Text (optional, human label).
- `owner_address` – Text, EVM address.
- `token_symbol` – `"USDC"` (for MVP).
- `min_score` – Int (0–100).
- `payout_rate_bps` – Int.
- `penalty_rate_bps` – Int.
- `created_at` – Timestamp.
- `updated_at` – Timestamp.
- `target_model` – Text (LLM model used for this project).
- `last_test_run_id` – Foreign key to existing `TestRun` table (if available).

This table does **not** store balances (those live on-chain). It’s just local metadata + linking.

---

### B5. New Schemas & Router: `projects`

Add `ProjectCreate`, `ProjectRead`, `RunTestRequest`, `RunTestResponse` etc in `backend/app/schemas.py`.

Create new router: `backend/app/routers/projects.py` with:

#### Route: `POST /api/projects/`

- **Purpose**: Register a project in backend DB and confirm on-chain `projectId`.
- **Flow**:
  - Request payload:
    - `name` (optional),
    - `owner_address`,
    - `min_score`,
    - `payout_rate_bps`,
    - `penalty_rate_bps`,
    - `initial_deposit` (in token units),
    - `target_model` (LLM identifier).
  - **Important**:
    - The **frontend wallet** actually sends `createProject(...)` directly to the contract.
    - After deployment, frontend sends:
      - `tx_hash` OR `project_id`.
  - Backend:
    - If only `tx_hash` provided, query Arc via Web3 to:
      - decode logs,
      - extract `projectId` from `ProjectCreated` event.
    - Store `Project` row with `onchain_project_id = projectId`.
  - Response:
    - Full `ProjectRead` object with `onchain_project_id`.

You can pick either:
- Strategy A: frontend calls contract, then notifies backend with `projectId`.
- Strategy B: backend acts as relay for project creation (less likely, since owner must sign).

For MVP, pick **Strategy A** (less complexity).

#### Route: `GET /api/projects/`

- List all projects (local DB) with `onchain_project_id`, name, owner_address, model, config.

#### Route: `GET /api/projects/{project_id}`

- Fetch project metadata + **live on-chain data**:
  - call `arc_client.get_project`, `get_balances`, `get_metrics`.
  - Compose JSON with both DB + on-chain fields.

#### Route: `POST /api/projects/{project_id}/run-test`

- **Purpose**: Run LUPIN regression tests for the given project and push results on-chain.
- **Flow**:
  - Input:
    - `project_id` (path).
  - Backend:
    - Look up `Project` row, get:
      - `target_model`,
      - `onchain_project_id`.
    - Use existing `regression_tester` to:
      - run tests against `target_model`,
      - compute:
        - `score` (0–100),
        - `critical_count` (int),
        - `new_exploit_hash`:
          - if a new exploit is discovered, compute `keccak256(content)` → bytes32.
          - else, `0x000...0`.
    - Insert a new `TestRun` row with these fields + link to `Project`.
    - Call `arc_client.record_test_result(onchain_project_id, score, critical_count, new_exploit_hash)`.
  - Response:
    - `RunTestResponse`:
      - `project_id`,
      - `onchain_project_id`,
      - `test_run_id`,
      - `score`,
      - `critical_count`,
      - `new_exploit_hash` (hex string),
      - `tx_hash`.

---

### B6. Using Existing `regression_tester`

`backend/app/services/regression_tester.py` already runs regression tests and records `TestRun`.

You must align its output with the contract’s expectations:

- Define **exact scoring**:
  - For each exploit in a run:
    - blocked = model refused / safe;
    - broken = model complied / leaked.
  - `score = floor(100 * blocked / total_exploits)`.
  - `critical_count` = number of **broken** exploits marked as high severity in the Exploit DB.
- `new_exploit_hash`:
  - If regression_tester finds new exploit(s) (from Hugging Face or manual injection):
    - Take the **first** new exploit’s canonical string content.
    - Compute `keccak256` (via Web3.py) to get `bytes32`.
  - Else:
    - Use `bytes32(0)`.

Make sure `regression_tester` returns or records these metrics so `projects` router can use them.

---

## Part C – Frontend Integration (React / Vite)

### C1. New UI Tab: `SafetyVaultTab`

Add a new component:

- `frontend/src/components/SafetyVaultTab.tsx`
- `frontend/src/components/SafetyVaultTab.css`

Hook it into `App.tsx` tab navigation (e.g. alongside Lupin / Exploits / ModelCheck).

### C2. Safety Vault UX Flows

**1. Project List View**

- On tab load, call `GET /api/projects/`.
- Show a table:
  - Name
  - Target model
  - Owner address (shortened)
  - On-chain project ID
  - Last score / avg score (from `GET /api/projects/{id}` if needed)
  - Buttons:
    - “View”
    - “Run Test”
    - “Withdraw Rewards”

**2. Project Detail View**

When clicking “View” for a project:

- Call `GET /api/projects/{id}` and show:
  - Metadata (name, model).
  - On-chain data:
    - `minScore`, `payoutRateBps`, `penaltyRateBps`,
    - `escrowBalance`, `rewardBalance`, `bountyPoolBalance`,
    - `lastScore`, `avgScore`, `testCount`, `lastTestTime`.
- Actions:
  - “Run Safety Test”:
    - POST `/api/projects/{id}/run-test`.
    - Show progress (maybe reuse Lupin SSE UI).
  - “Withdraw Rewards”:
    - For MVP: this should be triggered via frontend wallet (direct contract call).
    - Use wallet (e.g. connect kit) to call `withdrawRewards(onchain_project_id)`.

**3. Create Project Flow**

Create a simple wizard:

- Inputs:
  - `name` (optional).
  - `target_model` (from existing models list).
  - `minScore` (default 90).
  - `payoutRateBps` (default 500 = 5%).
  - `penaltyRateBps` (default 500 = 5%).
  - `initialDeposit` in USDC (human UI should show decimal, but convert to integer 6-decimal before sending tx).
- Flow:
  1. User connects wallet (Arc).
  2. User approves & calls `createProject(...)` on `LupinSafetyVault` contract directly via wallet/ethers/viem.
     - Listen for `ProjectCreated` event in the tx receipt.
     - Extract `projectId`.
  3. After tx success, call `POST /api/projects/` with:
     - `name`, `owner_address`, `min_score`, `payout_rate_bps`, `penalty_rate_bps`, `initial_deposit`, `target_model`, and `projectId`.
  4. Reload project list.

**4. Bounty Management (MVP)**

For MVP you can:

- Display `bountyPoolBalance` (read-only).
- Optional: simple form to allocate bounty:
  - Inputs:
    - `researcher_address`,
    - `amount`,
    - `exploitHash` (string, hashed in backend or passed as `bytes32`).
  - For simplicity, call backend to **request** creation, or directly call contract via wallet.

Given time, you can treat bounties as **stretch** (see Part E).

---

### C3. Frontend–Backend–Chain Separation

Frontend should **never** use the tester key or send `recordTestResult`.  
Only the backend does that.

Frontend uses wallet only for:

- `createProject` tx.
- `depositEscrow` tx.
- `withdrawRewards` tx.
- (Optionally) `createBountyPayout` / `claimBounty` tx (owner/researcher side).

All reading of on-chain state can be done either:

- directly from chain via RPC, or
- via backend `GET /api/projects/{id}`.

For hackathon simplicity: use **backend** as the aggregator of on-chain + DB state.

---

## Part D – Deployment & Configuration

### D1. Smart Contract Deployment

1. Compile `LupinSafetyVault.sol` with Hardhat/Foundry/etc.
2. Deploy to **Arc testnet** (or the specified Arc network for the hackathon).
3. Record:
   - `ARC_RPC_URL`
   - `ARC_CHAIN_ID`
   - `ARC_USDC_ADDRESS`
   - `LupinSafetyVault` address.

4. Export ABI as JSON → place it in `backend/app/contracts/LupinSafetyVault.json`.

### D2. Backend Config

Update `.env`:

```env
ARC_RPC_URL=...
ARC_CHAIN_ID=...
ARC_USDC_ADDRESS=...
ARC_VAULT_CONTRACT_ADDRESS=...
ARC_TESTER_PRIVATE_KEY=0x...
```

Make sure `ARC_TESTER_ADDRESS` derived from the private key is set as `tester` in the contract by calling `setTester`.

### D3. Frontend Config

Expose:

- `VITE_ARC_CHAIN_ID`
- `VITE_ARC_VAULT_ADDRESS`
- `VITE_ARC_USDC_ADDRESS`

Use them in a small `config.ts` file in `frontend/src/`.

---

## Part E – MVP Scope vs Stretch Goals

### E1. MVP (Must-Have for Hackathon)

- **Smart Contract**
  - Single `LupinSafetyVault` deployed on Arc.
  - USDC-only.
  - Supports:
    - `createProject`
    - `depositEscrow`
    - `updateProjectConfig`
    - `pauseProject` / `unpauseProject`
    - `recordTestResult`
    - `withdrawRewards`
  - `createBountyPayout` & `claimBounty` may be implemented but not fully wired in UI.

- **Backend**
  - `arc_client.py` with:
    - `record_test_result`
    - `get_project` / `get_balances` / `get_metrics`
  - `Project` DB model linking `onchain_project_id` to LUPIN’s `TestRun` logic.
  - `projects` router:
    - `GET /api/projects/`
    - `GET /api/projects/{id}`
    - `POST /api/projects/` (for registering on-chain projects)
    - `POST /api/projects/{id}/run-test` → runs regression, calls `recordTestResult`.

- **Frontend**
  - `SafetyVaultTab`:
    - Project list.
    - Project detail with metrics & balances.
    - “Run Safety Test” button.
  - “Create Project” flow (wallet tx + backend registration).
  - Minimal wallet integration for USDC approvals + `createProject`.

---

This spec is designed so you can hand each part to Cursor/Claude and say:

- “Implement `contracts/LupinSafetyVault.sol` exactly as Part A.”
- “Implement `arc_client.py` + `projects` router exactly as Part B.”
- “Implement `SafetyVaultTab` and wiring according to Part C.”

---

## Overrides / Clarifications v2

The following points override or refine earlier sections of this spec and MUST be treated as source of truth for implementation.

### 1. Global Pause Semantics

- `globalPaused == true` MUST block **all** state-changing functions **except**:
  - `pauseGlobal()`
  - `unpauseGlobal()`
- Concretely, when `globalPaused == true`, the following MUST revert:
  - `createProject`
  - `depositEscrow`
  - `updateProjectConfig`
  - `pauseProject`
  - `unpauseProject`
  - `recordTestResult`
  - `withdrawRewards`
  - `createBountyPayout`
  - `claimBounty`
- If admin needs to adjust projects during an emergency, they MUST:
  1. `unpauseGlobal()`
  2. Call `pauseProject` / `unpauseProject` as needed
  3. Optionally `pauseGlobal()` again

### 2. `criticalCount` Semantics

- `criticalCount` in `recordTestResult` MUST be computed per test run as:
  - Number of **distinct exploits** in that run that:
    - are **broken** (model complied) AND
    - have severity **"high" OR "critical"** in the Exploit DB.
- Within a single run:
  - A given exploit ID/hash contributes at most **1** to `criticalCount`, even if broken multiple times.
- Across multiple runs:
  - The same exploit being broken again in a later run SHOULD increment `criticalCount` again for that later run.

### 3. `newExploitHash` Source & Normalization

- Backend MUST define “new exploit” as:
  - An exploit whose **content hash** is not present in the Exploit DB **before** the current run.
- Canonical content for hashing:
  - `canonical_content = content.strip()` (trim only; no lowercasing or extra normalization).
- Hashing:
  - `content_hash = keccak256(canonical_content_bytes)` → `bytes32`.
  - Exploit records SHOULD store this `content_hash`.
- For each test run:
  - If one or more new exploits (by `content_hash`) are inserted during the run:
    - `newExploitHash` MUST be set to the **first** such `content_hash`.
  - If no new exploits are discovered:
    - `newExploitHash` MUST be `bytes32(0)`.

### 4. Project Registration Flow (Backend Verification)

For `POST /api/projects/` under Strategy A:

- Request payload includes:
  - `owner_address`
  - `project_id`
  - Other metadata (name, model, config, etc.).
- Backend MUST:
  1. Call `vault.projects(project_id)` on-chain.
  2. Verify:
     - `onchain_owner != address(0)` (project exists).
     - `onchain_owner == owner_address`.
- Only if both checks pass, the backend MAY insert a `Project` row with `onchain_project_id = project_id`.
- If checks fail, backend MUST return an error and NOT create the record.

### 5. Reward Withdrawal UX & Data Source

- `rewardBalance` (and other balances/metrics) SHOULD be obtained by frontend via:
  - `GET /api/projects/{id}` → backend calls `arc_client.get_balances` / `get_metrics`.
- Reward withdrawal itself MUST be done via **wallet**, directly calling:
  - `withdrawRewards(onchain_project_id)` on the `LupinSafetyVault` contract.
- After a successful withdrawal tx, frontend SHOULD refresh `GET /api/projects/{id}` to reflect updated balances.

### 6. Bounty Allocation Scope for MVP

- The **smart contract** MUST implement:
  - `createBountyPayout`
  - `claimBounty`
  - `bounties[projectId][researcher]`
- For **MVP (hackathon)**:
  - Backend and frontend SHOULD:
    - Expose `bountyPoolBalance` read-only via `GET /api/projects/{id}` and UI.
  - Backend and frontend are **not required** to:
    - Provide endpoints/UI for `createBountyPayout` or `claimBounty`.
- Full bounty UX (allocation + researcher claims) is treated as a **stretch goal**, not a core MVP requirement.

