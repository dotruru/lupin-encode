# Frontend Environment Configuration

Create a `.env` file in the `frontend/` directory with these values:

```env
# Arc Testnet Chain ID
VITE_ARC_CHAIN_ID=5042002

# Deployed LupinSafetyVault contract address
# Get this from Hardhat deployment output or ArcScan
VITE_ARC_VAULT_ADDRESS=0xC58975099823A60F101B62940d88e6c8De9A80b1

# Note: USDC address is hardcoded in SafetyVaultTab.tsx as:
# 0x3600000000000000000000000000000000000000
```

## How to get the vault address

After deploying via Hardhat:

```bash
npx hardhat run scripts/deploy-lupin-vault.js --network arcTestnet
```

Copy the printed address and use it as `VITE_ARC_VAULT_ADDRESS`.

