// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LupinSafetyVault
 * @notice Arc-based safety SLA system for LLM projects
 * @dev Implements deterministic reward/penalty logic based on safety test scores
 * 
 * Spec: lupin_arc_build_spec.md Part A
 * Security: Added SafeERC20, ReentrancyGuard, and other protections
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LupinSafetyVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Types & Structs (A3) ============
    
    struct Project {
        address owner;              // Project owner
        address token;              // Token contract address (USDC for MVP)
        
        uint8   minScore;           // Safety threshold (0–100)
        uint16  payoutRateBps;      // Reward rate in basis points (0–10_000)
        uint16  penaltyRateBps;     // Penalty rate in basis points (0–10_000)
        
        uint256 escrowBalance;      // Locked collateral
        uint256 rewardBalance;      // Accumulated rewards (withdrawable)
        uint256 bountyPoolBalance;  // Reserved for bounties
        
        uint8   lastScore;          // Last safety score
        uint8   avgScore;           // Simple running average of scores (rounded)
        uint32  testCount;          // Number of tests recorded
        uint64  lastTestTime;       // Unix timestamp of last test
        
        bool    active;             // Project is active (true) or paused (false)
    }
    
    // ============ State Variables (A3) ============
    
    address public admin;
    address public tester;          // Oracle wallet address (LUPIN backend)
    IERC20 public usdc;             // USDC token contract (MVP; EURC later)
    uint256 public nextProjectId = 1;
    bool public globalPaused;
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => uint256)) public bounties;
    
    // ============ Events (A4) ============
    
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed owner,
        address indexed token,
        uint8 minScore,
        uint16 payoutRateBps,
        uint16 penaltyRateBps,
        uint256 initialDeposit
    );
    
    event EscrowDeposited(uint256 indexed projectId, address indexed from, uint256 amount);
    
    event TestResultRecorded(
        uint256 indexed projectId,
        uint8 score,
        uint8 lastScore,
        uint8 avgScore,
        uint32 testCount,
        uint8 criticalCount,
        uint256 rewardAmount,
        uint256 penaltyAmount,
        bytes32 newExploitHash
    );
    
    event RewardsWithdrawn(uint256 indexed projectId, address indexed owner, uint256 amount);
    
    event BountyCreated(
        uint256 indexed projectId,
        address indexed researcher,
        uint256 amount,
        bytes32 exploitHash
    );
    
    event BountyClaimed(uint256 indexed projectId, address indexed researcher, uint256 amount);
    
    event ProjectConfigUpdated(
        uint256 indexed projectId,
        uint8 minScore,
        uint16 payoutRateBps,
        uint16 penaltyRateBps
    );
    
    event TesterUpdated(address indexed oldTester, address indexed newTester);
    
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    
    event ProjectPaused(uint256 indexed projectId);
    event ProjectUnpaused(uint256 indexed projectId);
    
    event GlobalPaused();
    event GlobalUnpaused();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier onlyTester() {
        require(msg.sender == tester, "Only tester");
        _;
    }
    
    modifier onlyProjectOwner(uint256 projectId) {
        require(projects[projectId].owner != address(0), "Project does not exist");
        require(msg.sender == projects[projectId].owner, "Only project owner");
        _;
    }
    
    modifier whenNotGlobalPaused() {
        require(!globalPaused, "Contract is globally paused");
        _;
    }
    
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].owner != address(0), "Project does not exist");
        _;
    }
    
    modifier projectActive(uint256 projectId) {
        require(projects[projectId].active, "Project is paused");
        _;
    }
    
    // ============ Constructor (A5.1) ============
    
    /**
     * @notice Initialize the LupinSafetyVault contract
     * @param _usdc Address of USDC ERC-20 token
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "USDC address cannot be zero");
        admin = msg.sender;
        tester = msg.sender;  // Can be updated later
        usdc = IERC20(_usdc);
        globalPaused = false;
    }
    
    // ============ Admin Functions (A5.2-A5.4) ============
    
    /**
     * @notice Transfer admin role to new address
     * @param newAdmin New admin address (non-zero)
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Admin cannot be zero address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminUpdated(oldAdmin, newAdmin);
    }
    
    /**
     * @notice Update tester/oracle address
     * @param newTester New tester address (non-zero)
     */
    function setTester(address newTester) external onlyAdmin {
        require(newTester != address(0), "Tester cannot be zero address");
        address oldTester = tester;
        tester = newTester;
        emit TesterUpdated(oldTester, newTester);
    }
    
    /**
     * @notice Emergency pause all state-changing functions
     */
    function pauseGlobal() external onlyAdmin {
        globalPaused = true;
        emit GlobalPaused();
    }
    
    /**
     * @notice Unpause global contract
     */
    function unpauseGlobal() external onlyAdmin {
        globalPaused = false;
        emit GlobalUnpaused();
    }
    
    // ============ Project Management (A5.5-A5.8) ============
    
    /**
     * @notice Create a new project with initial escrow deposit
     * @param minScore Safety threshold (0–100)
     * @param payoutRateBps Reward rate in basis points (0–10_000)
     * @param penaltyRateBps Penalty rate in basis points (0–10_000)
     * @param initialDeposit Amount of USDC to deposit as escrow (in token units)
     * @return projectId The ID of the newly created project
     */
    function createProject(
        uint8 minScore,
        uint16 payoutRateBps,
        uint16 penaltyRateBps,
        uint256 initialDeposit
    ) external whenNotGlobalPaused nonReentrant returns (uint256) {
        require(minScore <= 100, "minScore must be <= 100");
        require(payoutRateBps <= 10_000, "payoutRateBps must be <= 10_000");
        require(penaltyRateBps <= 10_000, "penaltyRateBps must be <= 10_000");
        require(initialDeposit > 0, "initialDeposit must be > 0");
        
        uint256 projectId = nextProjectId;
        nextProjectId++;
        
        // Transfer USDC from caller (using SafeERC20)
        usdc.safeTransferFrom(msg.sender, address(this), initialDeposit);
        
        projects[projectId] = Project({
            owner: msg.sender,
            token: address(usdc),
            minScore: minScore,
            payoutRateBps: payoutRateBps,
            penaltyRateBps: penaltyRateBps,
            escrowBalance: initialDeposit,
            rewardBalance: 0,
            bountyPoolBalance: 0,
            lastScore: 0,
            avgScore: 0,
            testCount: 0,
            lastTestTime: 0,
            active: true
        });
        
        emit ProjectCreated(
            projectId,
            msg.sender,
            address(usdc),
            minScore,
            payoutRateBps,
            penaltyRateBps,
            initialDeposit
        );
        
        return projectId;
    }
    
    /**
     * @notice Deposit additional escrow into project
     * @param projectId Project ID
     * @param amount Amount to deposit
     */
    function depositEscrow(uint256 projectId, uint256 amount)
        external
        whenNotGlobalPaused
        nonReentrant
        onlyProjectOwner(projectId)
        projectActive(projectId)
    {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer using SafeERC20
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        projects[projectId].escrowBalance += amount;
        
        emit EscrowDeposited(projectId, msg.sender, amount);
    }
    
    /**
     * @notice Update project configuration
     * @param projectId Project ID
     * @param minScore New safety threshold (0–100)
     * @param payoutRateBps New reward rate in basis points (0–10_000)
     * @param penaltyRateBps New penalty rate in basis points (0–10_000)
     */
    function updateProjectConfig(
        uint256 projectId,
        uint8 minScore,
        uint16 payoutRateBps,
        uint16 penaltyRateBps
    )
        external
        whenNotGlobalPaused
        onlyProjectOwner(projectId)
    {
        require(minScore <= 100, "minScore must be <= 100");
        require(payoutRateBps <= 10_000, "payoutRateBps must be <= 10_000");
        require(penaltyRateBps <= 10_000, "penaltyRateBps must be <= 10_000");
        
        projects[projectId].minScore = minScore;
        projects[projectId].payoutRateBps = payoutRateBps;
        projects[projectId].penaltyRateBps = penaltyRateBps;
        
        emit ProjectConfigUpdated(projectId, minScore, payoutRateBps, penaltyRateBps);
    }
    
    /**
     * @notice Pause a project (owner or admin)
     * @param projectId Project ID
     */
    function pauseProject(uint256 projectId)
        external
        whenNotGlobalPaused
        projectExists(projectId)
    {
        require(
            msg.sender == projects[projectId].owner || msg.sender == admin,
            "Only owner or admin"
        );
        
        projects[projectId].active = false;
        emit ProjectPaused(projectId);
    }
    
    /**
     * @notice Unpause a project (owner or admin)
     * @param projectId Project ID
     */
    function unpauseProject(uint256 projectId)
        external
        whenNotGlobalPaused
        projectExists(projectId)
    {
        require(
            msg.sender == projects[projectId].owner || msg.sender == admin,
            "Only owner or admin"
        );
        
        projects[projectId].active = true;
        emit ProjectUnpaused(projectId);
    }
    
    // ============ Core Oracle Function (A5.9) ============
    
    /**
     * @notice Record test result and apply reward/penalty logic
     * @dev This is the core oracle entry point - only callable by tester
     * @param projectId Project ID
     * @param score Safety score (0–100)
     * @param criticalCount Number of critical failures (0–255)
     * @param newExploitHash Hash of new exploit or 0x0
     */
    function recordTestResult(
        uint256 projectId,
        uint8 score,
        uint8 criticalCount,
        bytes32 newExploitHash
    )
        external
        whenNotGlobalPaused
        onlyTester
        projectExists(projectId)
        projectActive(projectId)
    {
        require(score <= 100, "Score must be <= 100");
        
        Project storage project = projects[projectId];
        
        // Update metrics (simplified to avoid stack too deep)
        _updateMetrics(project, score);
        
        // Apply reward/penalty logic
        (uint256 rewardAmount, uint256 penaltyAmount) = _applyRewardPenalty(
            project,
            score,
            criticalCount
        );
        
        emit TestResultRecorded(
            projectId,
            score,
            project.lastScore,
            project.avgScore,
            project.testCount,
            criticalCount,
            rewardAmount,
            penaltyAmount,
            newExploitHash
        );
    }
    
    /**
     * @dev Internal function to update metrics (avoid stack too deep)
     */
    function _updateMetrics(Project storage project, uint8 score) private {
        if (project.testCount == 0) {
            project.avgScore = score;
        } else {
            // Running average: (old_avg * count + new_score) / (count + 1)
            uint256 newAvg = (uint256(project.avgScore) * project.testCount + score) / (project.testCount + 1);
            project.avgScore = uint8(newAvg);
        }
        
        project.lastScore = score;
        project.testCount += 1;
        project.lastTestTime = uint64(block.timestamp);
    }
    
    /**
     * @dev Internal function to apply reward/penalty logic (optimized for stack)
     * @return rewardAmount Amount moved to rewards
     * @return penaltyAmount Amount moved to bounty pool
     */
    function _applyRewardPenalty(
        Project storage project,
        uint8 score,
        uint8 criticalCount
    ) private returns (uint256 rewardAmount, uint256 penaltyAmount) {
        // Cache storage reads to reduce stack pressure
        uint256 escrow = project.escrowBalance;
        
        if (escrow == 0) {
            return (0, 0);
        }
        
        if (score >= project.minScore) {
            // REWARD: score passes threshold
            // Split calculation to reduce stack depth
            uint256 payout = escrow * project.payoutRateBps;
            rewardAmount = payout / 10_000;
            
            if (rewardAmount > escrow) {
                rewardAmount = escrow;
            }
            
            project.escrowBalance -= rewardAmount;
            project.rewardBalance += rewardAmount;
            penaltyAmount = 0;
            
        } else {
            // PENALTY: score fails threshold
            uint256 basePenalty = (escrow * project.penaltyRateBps) / 10_000;
            
            // Double penalty if critical failures present (ternary to save stack)
            penaltyAmount = criticalCount > 0 ? basePenalty * 2 : basePenalty;
            
            if (penaltyAmount > escrow) {
                penaltyAmount = escrow;
            }
            
            project.escrowBalance -= penaltyAmount;
            project.bountyPoolBalance += penaltyAmount;
            rewardAmount = 0;
        }
        
        return (rewardAmount, penaltyAmount);
    }
    
    // ============ Reward & Bounty Functions (A5.10-A5.12) ============
    
    /**
     * @notice Withdraw accumulated rewards (owner only)
     * @param projectId Project ID
     */
    function withdrawRewards(uint256 projectId)
        external
        whenNotGlobalPaused
        nonReentrant
        onlyProjectOwner(projectId)
    {
        require(projects[projectId].rewardBalance > 0, "No rewards to withdraw");
        
        uint256 amount = projects[projectId].rewardBalance;
        address owner = projects[projectId].owner;
        
        // Update state before transfer (CEI pattern)
        projects[projectId].rewardBalance = 0;
        
        // Use SafeERC20 for transfer
        usdc.safeTransfer(owner, amount);
        
        emit RewardsWithdrawn(projectId, owner, amount);
    }
    
    /**
     * @notice Create bounty allocation for researcher (owner only)
     * @param projectId Project ID
     * @param researcher Researcher address
     * @param amount Bounty amount
     * @param exploitHash Hash of the exploit
     */
    function createBountyPayout(
        uint256 projectId,
        address researcher,
        uint256 amount,
        bytes32 exploitHash
    )
        external
        whenNotGlobalPaused
        nonReentrant
        onlyProjectOwner(projectId)
    {
        require(researcher != address(0), "Researcher cannot be zero address");
        require(amount > 0, "Amount must be > 0");
        require(projects[projectId].bountyPoolBalance >= amount, "Insufficient bounty pool");
        
        projects[projectId].bountyPoolBalance -= amount;
        bounties[projectId][researcher] += amount;
        
        emit BountyCreated(projectId, researcher, amount, exploitHash);
    }
    
    /**
     * @notice Claim allocated bounty (researcher)
     * @param projectId Project ID
     */
    function claimBounty(uint256 projectId)
        external
        whenNotGlobalPaused
        nonReentrant
        projectExists(projectId)
    {
        uint256 pending = bounties[projectId][msg.sender];
        require(pending > 0, "No bounty to claim");
        
        // Update state before transfer (CEI pattern)
        bounties[projectId][msg.sender] = 0;
        
        // Use SafeERC20 for transfer
        usdc.safeTransfer(msg.sender, pending);
        
        emit BountyClaimed(projectId, msg.sender, pending);
    }
    
    // ============ View Functions (A6) ============
    
    /**
     * @notice Get full project details
     * @param projectId Project ID
     * @return project Project struct
     */
    function getProject(uint256 projectId) external view returns (Project memory project) {
        require(projects[projectId].owner != address(0), "Project does not exist");
        return projects[projectId];
    }
    
    /**
     * @notice Get project balances
     * @param projectId Project ID
     * @return escrow Escrow balance
     * @return reward Reward balance
     * @return bountyPool Bounty pool balance
     */
    function getBalances(uint256 projectId)
        external
        view
        returns (uint256 escrow, uint256 reward, uint256 bountyPool)
    {
        require(projects[projectId].owner != address(0), "Project does not exist");
        Project storage project = projects[projectId];
        return (project.escrowBalance, project.rewardBalance, project.bountyPoolBalance);
    }
    
    /**
     * @notice Get project metrics
     * @param projectId Project ID
     * @return lastScore Last safety score
     * @return avgScore Average safety score
     * @return testCount Number of tests
     * @return lastTestTime Last test timestamp
     */
    function getMetrics(uint256 projectId)
        external
        view
        returns (uint8 lastScore, uint8 avgScore, uint32 testCount, uint64 lastTestTime)
    {
        require(projects[projectId].owner != address(0), "Project does not exist");
        Project storage project = projects[projectId];
        return (project.lastScore, project.avgScore, project.testCount, project.lastTestTime);
    }
}
