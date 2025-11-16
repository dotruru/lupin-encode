import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Official USDC address on Arc Testnet
  const USDC_ARC_TESTNET =
    process.env.ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000';

  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
  const chainId = Number(process.env.ARC_CHAIN_ID || 5042002);
  const privateKey = process.env.ARC_DEPLOYER_KEY;

  if (!privateKey) {
    throw new Error('ARC_DEPLOYER_KEY not set in .env');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying LupinSafetyVault with deployer:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Deployer native balance (for gas):', ethers.formatUnits(balance, 18));

  // Load compiled artifact produced by `npx hardhat compile`
  const artifact = await import(
    '../artifacts/contracts/LupinSafetyVault.sol/LupinSafetyVault.json',
    { assert: { type: 'json' } }
  );

  const { abi, bytecode } = artifact.default;

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const vault = await factory.deploy(USDC_ARC_TESTNET);

  console.log('Transaction sent. Waiting for confirmation...');
  await vault.deployed;

  const address = await vault.getAddress();
  console.log('✅ LupinSafetyVault deployed to:', address);
  console.log('\nNext steps:');
  console.log('- Set ARC_VAULT_CONTRACT_ADDRESS in backend/.env to this address');
  console.log('- Set VITE_ARC_VAULT_ADDRESS in frontend/.env to this address');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

