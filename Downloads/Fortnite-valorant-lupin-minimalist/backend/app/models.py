from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String, primary_key=True, default=generate_uuid)
    content = Column(Text, nullable=False)
    source = Column(String(100))  # 'L1B3RT4S' or 'CL4R1T4S'
    category = Column(String(50))  # 'jailbreak', 'system_prompt', etc.
    subcategory = Column(String(50))
    provider = Column(String(50))  # 'anthropic', 'openai', etc.
    severity = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    success_rate = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    extra_data = Column(JSON)

class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(Text)
    success = Column(Boolean, default=False)
    model_name = Column(String(100))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    extra_data = Column(JSON)

class Exploit(Base):
    """CVE-style tracking for prompt injections and exploits"""
    __tablename__ = "exploits"

    id = Column(String, primary_key=True, default=generate_uuid)
    cve_id = Column(String(50), unique=True, nullable=False)  # e.g., PIE-2024-001
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    exploit_content = Column(Text, nullable=False)  # The actual exploit/injection
    content_hash = Column(String(66))  # keccak256 hash (0x + 64 hex chars) for Arc integration
    exploit_type = Column(String(50))  # 'prompt_injection', 'jailbreak', 'data_extraction', etc.
    severity = Column(String(20))  # 'low', 'medium', 'high', 'critical'
    source = Column(String(200))  # Where it was discovered (URL, researcher, etc.)
    source_type = Column(String(50))  # 'perplexity', 'manual', 'github', 'bug_bounty'
    target_models = Column(JSON)  # List of models vulnerable to this
    mitigation = Column(Text)  # Mitigation strategies
    status = Column(String(20), default='active')  # 'active', 'patched', 'archived'
    discovered_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    extra_data = Column(JSON)

class TestRun(Base):
    """Regression test runs to track safety metrics over time"""
    __tablename__ = "test_runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_name = Column(String(200))
    exploit_id = Column(String, nullable=False)  # Foreign key to exploits
    target_model = Column(String(100), nullable=False)
    test_prompt = Column(Text, nullable=False)  # The test prompt used
    response = Column(Text)  # Model's response
    success = Column(Boolean, default=False)  # Did the exploit work?
    blocked = Column(Boolean, default=False)  # Was it blocked/refused?
    execution_time_ms = Column(Integer)  # How long it took
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    extra_data = Column(JSON)  # Can store confidence scores, metadata, etc.

class AIProvider(Base):
    """Contact information for AI model providers for security notifications"""
    __tablename__ = "ai_providers"

    id = Column(String, primary_key=True, default=generate_uuid)
    provider_name = Column(String(100), unique=True, nullable=False)  # 'anthropic', 'openai', 'google', etc.
    company_name = Column(String(200), nullable=False)  # Full company name
    security_email = Column(String(200))  # Email for security notifications
    webhook_url = Column(String(500))  # Webhook endpoint for notifications
    contact_name = Column(String(200))  # Primary security contact
    notification_enabled = Column(Boolean, default=True)  # Enable/disable notifications
    notification_method = Column(String(20), default='email')  # 'email', 'webhook', 'both'
    model_patterns = Column(JSON)  # List of model name patterns this provider owns (e.g., ['gpt-*', 'o1-*'])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    extra_data = Column(JSON)  # Additional contact info, API keys for secure webhooks, etc.

class JailbreakNotification(Base):
    """Log of all jailbreak notifications sent to AI providers"""
    __tablename__ = "jailbreak_notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    provider_id = Column(String, nullable=False)  # Foreign key to ai_providers
    attempt_id = Column(String)  # Foreign key to attempts (if available)
    test_run_id = Column(String)  # Foreign key to test_runs (if from regression test)
    exploit_id = Column(String)  # Foreign key to exploits (if using a known PIE)
    model_name = Column(String(100), nullable=False)  # The model that was jailbroken
    jailbreak_prompt = Column(Text, nullable=False)  # The PIE that succeeded
    notification_method = Column(String(20))  # 'email' or 'webhook'
    notification_status = Column(String(20), default='pending')  # 'pending', 'sent', 'failed'
    notification_response = Column(Text)  # Response from email server or webhook
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    extra_data = Column(JSON)  # Full notification payload, error details, etc.

class Project(Base):
    """
    Arc Safety Vault project metadata (local DB)
    Maps to on-chain LupinSafetyVault projects
    Spec: lupin_arc_build_spec.md Part B.4
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    onchain_project_id = Column(Integer, unique=True, nullable=False)  # Maps to Solidity projectId
    name = Column(String(200))  # Optional human-friendly label
    owner_address = Column(String(42), nullable=False)  # EVM address (checksummed)
    token_symbol = Column(String(10), default='USDC')  # Token symbol (USDC for MVP)
    
    # Configuration (mirrored from on-chain for convenience)
    min_score = Column(Integer, nullable=False)  # Safety threshold (0–100)
    payout_rate_bps = Column(Integer, nullable=False)  # Reward rate in basis points
    penalty_rate_bps = Column(Integer, nullable=False)  # Penalty rate in basis points
    
    # LLM Testing Configuration
    target_model = Column(String(100), nullable=False)  # LLM model identifier (e.g., "gpt-4", "claude-3")
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign key to last test run (optional)
    last_test_run_id = Column(String)  # FK to test_runs table
    
    extra_data = Column(JSON)  # Additional metadata (tx_hash, notes, etc.)
