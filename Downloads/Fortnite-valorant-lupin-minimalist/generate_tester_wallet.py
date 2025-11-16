#!/usr/bin/env python3
"""
Generate a new tester wallet for Arc Safety Vault backend oracle
Run: python3 generate_tester_wallet.py
"""

from eth_account import Account
import secrets

def generate_wallet():
    """Generate a new Ethereum wallet"""
    # Generate random private key
    private_key = "0x" + secrets.token_hex(32)
    
    # Create account from private key
    account = Account.from_key(private_key)
    
    return {
        "address": account.address,
        "private_key": private_key
    }

if __name__ == "__main__":
    print("=" * 60)
    print("Arc Safety Vault - Tester Wallet Generator")
    print("=" * 60)
    print()
    
    wallet = generate_wallet()
    
    print("✓ New wallet generated!")
    print()
    print("Address:")
    print(f"  {wallet['address']}")
    print()
    print("Private Key:")
    print(f"  {wallet['private_key']}")
    print()
    print("=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print()
    print("1. Fund this address with USDC from faucet:")
    print("   https://faucet.circle.com/")
    print("   - Select: Arc Testnet")
    print("   - Select: USDC")
    print(f"   - Address: {wallet['address']}")
    print()
    print("2. After deploying LupinSafetyVault, call setTester():")
    print(f"   vault.setTester('{wallet['address']}')")
    print()
    print("3. Add to backend/.env:")
    print(f"   ARC_TESTER_PRIVATE_KEY={wallet['private_key']}")
    print()
    print("⚠️  SECURITY WARNING:")
    print("   - Never share this private key")
    print("   - Never commit .env file to git")
    print("   - This key should only be on the backend server")
    print()
    print("=" * 60)

