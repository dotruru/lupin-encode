import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const CHAIN_ID = Number(process.env.ARC_CHAIN_ID || 5042002);
const OWNER_KEY = process.env.ARC_OWNER_KEY;
const USDC = process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';
const VAULT = process.env.ARC_VAULT_CONTRACT_ADDRESS;

// Minimal ABIs for the functions we need
const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)'
];

const VAULT_ABI = [
  'function createProject(uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps, uint256 initialDeposit) external returns (uint256)',
  'event ProjectCreated(uint256 indexed projectId, address indexed owner, address indexed token, uint8 minScore, uint16 payoutRateBps, uint16 penaltyRateBps, uint256 initialDeposit)'
];

async function main() {
  if (!OWNER_KEY) {
    throw new Error('ARC_OWNER_KEY not set in .env (owner wallet private key)');
  }
  if (!VAULT) {
    throw new Error('ARC_VAULT_CONTRACT_ADDRESS not set in .env (vault contract address)');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const owner = new ethers.Wallet(OWNER_KEY, provider);

  console.log('Using owner wallet:', owner.address);

  const usdc = new ethers.Contract(USDC, USDC_ABI, owner);
  const vault = new ethers.Contract(VAULT, VAULT_ABI, owner);

  const amount = 3_000_000n; // 3 USDC (6 decimals)

  // 1) Approve USDC
  console.log(`Approving ${amount} USDC for vault ${VAULT}...`);
  const approveTx = await usdc.approve(VAULT, amount);
  console.log('approve() tx hash:', approveTx.hash);
  await approveTx.wait();
  console.log('✅ approve() confirmed');

  // 2) Create project
  const minScore = 85;
  const payoutRateBps = 300;  // 3%
  const penaltyRateBps = 300; // 3%

  console.log('Calling createProject(...) on vault...');
  const createTx = await vault.createProject(
    minScore,
    payoutRateBps,
    penaltyRateBps,
    amount
  );
  console.log('createProject() tx hash:', createTx.hash);

  const receipt = await createTx.wait();
  console.log('✅ createProject() confirmed');

  // Try to read projectId from ProjectCreated event
  let projectId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed && parsed.name === 'ProjectCreated') {
        projectId = parsed.args.projectId.toString();
        break;
      }
    } catch {
      // ignore non-matching logs
    }
  }

  if (projectId === null) {
    console.log('⚠️ Could not parse ProjectCreated event. Check the transaction on ArcScan for projectId.');
  } else {
    console.log('🎯 New projectId:', projectId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


