"""
Hash utilities for Arc integration
Spec: lupin_arc_build_spec.md section 3 (newExploitHash Source & Normalization)
"""
from web3 import Web3


def compute_content_hash(content: str) -> str:
    """
    Compute keccak256 hash of exploit content
    
    Per spec section 3:
    - canonical_content = content.strip() (trim only; no lowercasing)
    - content_hash = keccak256(canonical_content_bytes)
    
    Args:
        content: Raw exploit content string
        
    Returns:
        Hex string with 0x prefix (66 chars total: 0x + 64 hex digits)
    """
    if not content:
        return '0x' + '0' * 64  # bytes32(0)
    
    # Normalize: trim whitespace only
    canonical_content = content.strip()
    
    # Encode to bytes
    content_bytes = canonical_content.encode('utf-8')
    
    # Compute keccak256
    hash_bytes = Web3.keccak(content_bytes)
    
    # Return as hex string with 0x prefix
    return hash_bytes.hex()


def ensure_content_hash(exploit_content: str, existing_hash: str = None) -> str:
    """
    Ensure exploit has a content hash, computing if missing
    
    Args:
        exploit_content: The exploit content
        existing_hash: Existing hash if already computed
        
    Returns:
        Content hash (hex string)
    """
    if existing_hash and existing_hash.startswith('0x') and len(existing_hash) == 66:
        return existing_hash
    
    return compute_content_hash(exploit_content)

