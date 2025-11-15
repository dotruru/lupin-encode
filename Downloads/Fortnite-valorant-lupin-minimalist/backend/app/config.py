"""
Configuration file for API keys and settings.
Store sensitive keys here (not committed to git).
"""
import os

# API Keys for external services
OPENROUTER_KEY = os.getenv(
    "OPENROUTER_KEY",
    ""  # Set via environment variable
)

# HuggingFace API Key - Add your key here
# Get one from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "your_huggingface_key_here")  # Replace with actual key

# Perplexity API Key - Add your key here (optional)
# Get one from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY = os.getenv(
    "PERPLEXITY_API_KEY",
    ""  # Set via environment variable
)  # Optional: Replace with actual key if available

# Search settings
DEFAULT_SEARCH_TYPE = os.getenv("DEFAULT_SEARCH_TYPE", "web")  # "llm" for HuggingFace, "web" for Perplexity
MAX_SEARCH_RESULTS = int(os.getenv("MAX_SEARCH_RESULTS", "10"))

# Predefined search queries for automatic discovery
DISCOVERY_QUERIES = [
    "latest prompt injection exploits and jailbreaks 2025",
    "recent LLM jailbreak techniques GitHub",
    "prompt injection CVE vulnerabilities",
    "AI safety bypass methods",
    "large language model security vulnerabilities",
    "GPT jailbreak prompts",
    "Claude AI prompt injection",
    "adversarial prompts for LLMs"
]

# Notification (ethical disclosure) settings
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "security@lupin-red-team.com")
NOTIFICATION_ENABLED = os.getenv("NOTIFICATION_ENABLED", "true").lower() in ("1", "true", "yes")

# Arc Blockchain Settings (Part B.1 - Safety Vault Integration)
ARC_RPC_URL = os.getenv("ARC_RPC_URL", "")  # Arc RPC endpoint
ARC_CHAIN_ID = int(os.getenv("ARC_CHAIN_ID", "0"))  # Arc chain ID
ARC_USDC_ADDRESS = os.getenv("ARC_USDC_ADDRESS", "")  # USDC token contract on Arc
ARC_VAULT_CONTRACT_ADDRESS = os.getenv("ARC_VAULT_CONTRACT_ADDRESS", "")  # LupinSafetyVault contract
ARC_TESTER_PRIVATE_KEY = os.getenv("ARC_TESTER_PRIVATE_KEY", "")  # Backend oracle private key
ARC_GAS_PRICE = os.getenv("ARC_GAS_PRICE", "")  # Optional: override gas price (in wei)
