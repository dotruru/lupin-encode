# Environment Variables Template

Copy this to `.env` in the backend directory and fill in your values.

```env
# Arc Blockchain Configuration (Safety Vault Integration)
ARC_RPC_URL=https://arc-testnet-rpc.example.com
ARC_CHAIN_ID=123456
ARC_USDC_ADDRESS=0x...
ARC_VAULT_CONTRACT_ADDRESS=0x...
ARC_TESTER_PRIVATE_KEY=0x...
ARC_GAS_PRICE=

# API Keys for LLM Services
OPENROUTER_KEY=sk-or-v1-...
PERPLEXITY_API_KEY=pplx-...
HUGGINGFACE_API_KEY=hf_...

# Search Configuration
DEFAULT_SEARCH_TYPE=web
MAX_SEARCH_RESULTS=10

# Notification Settings (Ethical Disclosure)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=security@lupin-red-team.com
NOTIFICATION_ENABLED=true

# Optional: GitHub Token for Scrapers
GITHUB_TOKEN=
```

## Frontend Environment Variables

Copy this to `.env` in the frontend directory:

```env
VITE_ARC_CHAIN_ID=123456
VITE_ARC_VAULT_ADDRESS=0x...
VITE_ARC_USDC_ADDRESS=0x...
```

