"""
Arc Blockchain Client for LupinSafetyVault Contract Interaction
Spec: lupin_arc_build_spec.md Part B.3
"""
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from hexbytes import HexBytes

from app import config

logger = logging.getLogger(__name__)


class ArcClientError(Exception):
    """Custom exception for Arc client errors"""
    pass


class ArcClient:
    """
    Web3 client for interacting with LupinSafetyVault contract on Arc
    
    Responsibilities:
    - Initialize Web3 with Arc RPC
    - Load contract ABI
    - Provide high-level functions for contract interaction
    - Sign and send transactions from tester address
    """
    
    def __init__(self):
        """Initialize Arc Web3 client with configuration"""
        # Check required configuration
        if not config.ARC_VAULT_CONTRACT_ADDRESS:
            raise ArcClientError(
                "ARC_VAULT_CONTRACT_ADDRESS not configured. "
                "Deploy LupinSafetyVault.sol first, then set in .env"
            )
        
        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(config.ARC_RPC_URL))
        
        # Add PoA middleware if needed (Arc might be PoA-based)
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Verify connection
        if not self.w3.is_connected():
            raise ArcClientError(f"Cannot connect to Arc RPC: {config.ARC_RPC_URL}")
        
        self.chain_id = config.ARC_CHAIN_ID
        self.vault_address = Web3.to_checksum_address(config.ARC_VAULT_CONTRACT_ADDRESS)
        
        # Load tester account
        if config.ARC_TESTER_PRIVATE_KEY:
            self.tester_account = Account.from_key(config.ARC_TESTER_PRIVATE_KEY)
            self.tester_address = self.tester_account.address
            logger.info(f"Arc client initialized with tester: {self.tester_address}")
        else:
            self.tester_account = None
            self.tester_address = None
            logger.warning("ARC_TESTER_PRIVATE_KEY not set - read-only mode")
        
        # Load contract ABI
        self.contract_abi = self._load_abi()
        self.vault_contract = self.w3.eth.contract(
            address=self.vault_address,
            abi=self.contract_abi
        )
        
        logger.info(f"Arc client initialized: chain_id={self.chain_id}, vault={self.vault_address}")
    
    def _load_abi(self) -> list:
        """Load LupinSafetyVault ABI from JSON file"""
        abi_path = Path(__file__).parent.parent / "contracts" / "LupinSafetyVault.json"
        
        if not abi_path.exists():
            raise ArcClientError(
                f"Contract ABI not found at {abi_path}. "
                "Please compile the contract and export the ABI."
            )
        
        try:
            with open(abi_path, 'r') as f:
                abi_data = json.load(f)
                # Handle both raw ABI array and compiled artifact format
                if isinstance(abi_data, list):
                    return abi_data
                elif isinstance(abi_data, dict) and 'abi' in abi_data:
                    return abi_data['abi']
                else:
                    raise ValueError("Invalid ABI format")
        except Exception as e:
            raise ArcClientError(f"Failed to load ABI: {e}")
    
    def get_project(self, project_id: int) -> Dict[str, Any]:
        """
        Fetch project details from contract
        
        Args:
            project_id: On-chain project ID
            
        Returns:
            Dictionary with project data (owner, token, config, balances, metrics, active)
        """
        try:
            project = self.vault_contract.functions.getProject(project_id).call()
            
            # Parse struct into dictionary
            # Solidity struct order: owner, token, minScore, payoutRateBps, penaltyRateBps,
            #                        escrowBalance, rewardBalance, bountyPoolBalance,
            #                        lastScore, avgScore, testCount, lastTestTime, active
            return {
                "owner": project[0],
                "token": project[1],
                "min_score": project[2],
                "payout_rate_bps": project[3],
                "penalty_rate_bps": project[4],
                "escrow_balance": project[5],
                "reward_balance": project[6],
                "bounty_pool_balance": project[7],
                "last_score": project[8],
                "avg_score": project[9],
                "test_count": project[10],
                "last_test_time": project[11],
                "active": project[12]
            }
        except Exception as e:
            raise ArcClientError(f"Failed to get project {project_id}: {e}")
    
    def get_balances(self, project_id: int) -> Dict[str, int]:
        """
        Fetch project balances from contract
        
        Args:
            project_id: On-chain project ID
            
        Returns:
            Dictionary with escrow, reward, bounty_pool balances
        """
        try:
            escrow, reward, bounty_pool = self.vault_contract.functions.getBalances(project_id).call()
            return {
                "escrow_balance": escrow,
                "reward_balance": reward,
                "bounty_pool_balance": bounty_pool
            }
        except Exception as e:
            raise ArcClientError(f"Failed to get balances for project {project_id}: {e}")
    
    def get_metrics(self, project_id: int) -> Dict[str, Any]:
        """
        Fetch project metrics from contract
        
        Args:
            project_id: On-chain project ID
            
        Returns:
            Dictionary with last_score, avg_score, test_count, last_test_time
        """
        try:
            last_score, avg_score, test_count, last_test_time = \
                self.vault_contract.functions.getMetrics(project_id).call()
            return {
                "last_score": last_score,
                "avg_score": avg_score,
                "test_count": test_count,
                "last_test_time": last_test_time
            }
        except Exception as e:
            raise ArcClientError(f"Failed to get metrics for project {project_id}: {e}")
    
    def record_test_result(
        self,
        project_id: int,
        score: int,
        critical_count: int,
        new_exploit_hash: bytes
    ) -> str:
        """
        Record test result on-chain (signs and sends transaction from tester account)
        
        Args:
            project_id: On-chain project ID
            score: Safety score (0-100)
            critical_count: Number of critical failures
            new_exploit_hash: Hash of new exploit or bytes32(0)
            
        Returns:
            Transaction hash (hex string)
            
        Raises:
            ArcClientError if tester account not configured or transaction fails
        """
        if not self.tester_account:
            raise ArcClientError("Cannot record test result: ARC_TESTER_PRIVATE_KEY not configured")
        
        try:
            # Validate inputs
            if not (0 <= score <= 100):
                raise ValueError(f"Invalid score: {score} (must be 0-100)")
            if not (0 <= critical_count <= 255):
                raise ValueError(f"Invalid critical_count: {critical_count} (must be 0-255)")
            
            # Convert hash to bytes32 if needed
            if isinstance(new_exploit_hash, str):
                if new_exploit_hash.startswith('0x'):
                    new_exploit_hash = bytes.fromhex(new_exploit_hash[2:])
                else:
                    new_exploit_hash = bytes.fromhex(new_exploit_hash)
            
            # Ensure hash is 32 bytes
            if len(new_exploit_hash) != 32:
                raise ValueError(f"Invalid exploit hash length: {len(new_exploit_hash)} (must be 32 bytes)")
            
            # Build transaction
            function_call = self.vault_contract.functions.recordTestResult(
                project_id,
                score,
                critical_count,
                new_exploit_hash
            )
            
            # Get current nonce
            nonce = self.w3.eth.get_transaction_count(self.tester_address)
            
            # Estimate gas
            try:
                gas_estimate = function_call.estimate_gas({'from': self.tester_address})
                gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
            except Exception as e:
                logger.warning(f"Gas estimation failed, using default: {e}")
                gas_limit = 200_000  # Fallback
            
            # Get gas price
            if config.ARC_GAS_PRICE:
                gas_price = int(config.ARC_GAS_PRICE)
            else:
                gas_price = self.w3.eth.gas_price
            
            # Build transaction dict
            tx = function_call.build_transaction({
                'from': self.tester_address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'chainId': self.chain_id
            })
            
            # Sign transaction
            signed_tx = self.tester_account.sign_transaction(tx)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt (with timeout)
            logger.info(f"Submitted test result tx: {tx_hash.hex()}")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt['status'] == 0:
                raise ArcClientError(f"Transaction reverted: {tx_hash.hex()}")
            
            logger.info(
                f"Test result recorded on-chain: project={project_id}, "
                f"score={score}, tx={tx_hash.hex()}"
            )
            
            return tx_hash.hex()
            
        except Exception as e:
            logger.error(f"Failed to record test result: {e}", exc_info=True)
            raise ArcClientError(f"Failed to record test result: {e}")
    
    def verify_project_ownership(self, project_id: int, expected_owner: str) -> bool:
        """
        Verify that a project exists and matches the expected owner
        
        Args:
            project_id: On-chain project ID
            expected_owner: Expected owner address
            
        Returns:
            True if project exists and owner matches, False otherwise
        """
        try:
            project = self.get_project(project_id)
            
            # Check if project exists (owner is not zero address)
            if project['owner'] == '0x0000000000000000000000000000000000000000':
                logger.warning(f"Project {project_id} does not exist")
                return False
            
            # Normalize addresses for comparison
            project_owner = Web3.to_checksum_address(project['owner'])
            expected_owner_checksum = Web3.to_checksum_address(expected_owner)
            
            if project_owner != expected_owner_checksum:
                logger.warning(
                    f"Project {project_id} owner mismatch: "
                    f"expected={expected_owner_checksum}, actual={project_owner}"
                )
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying project ownership: {e}")
            return False


# Global instance (initialized on import)
try:
    arc_client = ArcClient()
except ArcClientError as e:
    logger.warning(f"Arc client not initialized: {e}")
    arc_client = None

