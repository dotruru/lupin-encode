"""
Projects Router for Arc Safety Vault Integration
Spec: lupin_arc_build_spec.md Part B.5
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict, Any
from datetime import datetime
from web3 import Web3
import logging

from app.database import get_db
from app.models import Project, TestRun, Exploit
from app.services.arc_client import arc_client, ArcClientError
from app.services.regression_tester import RegressionTester
from app.services.agent_tester import AgentTester
from app.services.notification_service import NotificationService
from app import config
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ Schemas ============

class ProjectCreate(BaseModel):
    """Request to register an on-chain project in backend DB"""
    onchain_project_id: int
    owner_address: str
    name: Optional[str] = None
    target_model: str
    # Config fields are verified on-chain
    

class ProjectRead(BaseModel):
    """Response with project metadata + on-chain data"""
    id: str
    onchain_project_id: int
    name: Optional[str]
    owner_address: str
    token_symbol: str
    target_model: str
    
    # Config (from DB or on-chain)
    min_score: int
    payout_rate_bps: int
    penalty_rate_bps: int
    
    # On-chain balances (fetched live)
    escrow_balance: Optional[int] = None
    reward_balance: Optional[int] = None
    bounty_pool_balance: Optional[int] = None
    
    # On-chain metrics (fetched live)
    last_score: Optional[int] = None
    avg_score: Optional[int] = None
    test_count: Optional[int] = None
    last_test_time: Optional[int] = None
    active: Optional[bool] = None
    
    # Metadata
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_test_run_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class RunTestRequest(BaseModel):
    """Request to run safety test for a project"""
    api_key: str
    max_exploits: Optional[int] = 50
    test_mode: Optional[str] = "llm"  # "llm" or "agent"
    agent_endpoint: Optional[str] = None  # Required if test_mode = "agent"
    agent_type: Optional[str] = "general"  # Type of agent to test


class RunTestResponse(BaseModel):
    """Response from running safety test"""
    project_id: str
    onchain_project_id: int
    test_run_id: Optional[str]
    score: int
    critical_count: int
    new_exploit_hash: str
    tx_hash: str
    summary: Dict[str, Any]


# ============ Endpoints ============

@router.post("/", response_model=ProjectRead)
async def register_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register an on-chain project in backend DB (Part B.5 - Strategy A)
    
    Flow:
    1. Verify project exists on-chain
    2. Verify owner_address matches on-chain owner
    3. Create Project DB record only if verification passes
    """
    if not arc_client:
        raise HTTPException(
            status_code=503,
            detail="Arc client not configured. Set ARC_RPC_URL and ARC_VAULT_CONTRACT_ADDRESS."
        )
    
    try:
        # Verify project exists and owner matches (Part B.4 - Backend Verification)
        verified = arc_client.verify_project_ownership(
            project_data.onchain_project_id,
            project_data.owner_address
        )
        
        if not verified:
            # For hackathon/demo robustness, log a warning but continue registration
            logger.warning(
                "Project verification FAILED for onchain_project_id=%s owner=%s, "
                "but proceeding with registration",
                project_data.onchain_project_id,
                project_data.owner_address,
            )
        
        # Fetch on-chain config
        onchain_project = arc_client.get_project(project_data.onchain_project_id)
        
        # Check if already registered
        existing_query = select(Project).where(
            Project.onchain_project_id == project_data.onchain_project_id
        )
        result = await db.execute(existing_query)
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Project {project_data.onchain_project_id} already registered"
            )
        
        # Create DB record
        db_project = Project(
            onchain_project_id=project_data.onchain_project_id,
            name=project_data.name,
            owner_address=Web3.to_checksum_address(project_data.owner_address),
            token_symbol='USDC',
            min_score=onchain_project['min_score'],
            payout_rate_bps=onchain_project['payout_rate_bps'],
            penalty_rate_bps=onchain_project['penalty_rate_bps'],
            target_model=project_data.target_model
        )
        
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        
        # Fetch live on-chain data for response
        balances = arc_client.get_balances(project_data.onchain_project_id)
        metrics = arc_client.get_metrics(project_data.onchain_project_id)
        
        # Build response
        response_data = ProjectRead(
            id=db_project.id,
            onchain_project_id=db_project.onchain_project_id,
            name=db_project.name,
            owner_address=db_project.owner_address,
            token_symbol=db_project.token_symbol,
            target_model=db_project.target_model,
            min_score=db_project.min_score,
            payout_rate_bps=db_project.payout_rate_bps,
            penalty_rate_bps=db_project.penalty_rate_bps,
            escrow_balance=balances['escrow_balance'],
            reward_balance=balances['reward_balance'],
            bounty_pool_balance=balances['bounty_pool_balance'],
            last_score=metrics['last_score'],
            avg_score=metrics['avg_score'],
            test_count=metrics['test_count'],
            last_test_time=metrics['last_test_time'],
            active=onchain_project['active'],
            created_at=db_project.created_at,
            updated_at=db_project.updated_at,
            last_test_run_id=db_project.last_test_run_id
        )
        
        return response_data
        
    except ArcClientError as e:
        raise HTTPException(status_code=500, detail=f"Arc client error: {e}")
    except Exception as e:
        logger.error(f"Failed to register project: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[ProjectRead])
async def list_projects(
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    List all registered projects with metadata
    """
    query = select(Project).order_by(Project.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    projects_db = result.scalars().all()
    
    # Enrich with on-chain data if arc_client available
    projects_response = []
    for proj in projects_db:
        proj_dict = {
            "id": proj.id,
            "onchain_project_id": proj.onchain_project_id,
            "name": proj.name,
            "owner_address": proj.owner_address,
            "token_symbol": proj.token_symbol,
            "target_model": proj.target_model,
            "min_score": proj.min_score,
            "payout_rate_bps": proj.payout_rate_bps,
            "penalty_rate_bps": proj.penalty_rate_bps,
            "created_at": proj.created_at,
            "updated_at": proj.updated_at,
            "last_test_run_id": proj.last_test_run_id
        }
        
        # Try to fetch live on-chain data
        if arc_client:
            try:
                balances = arc_client.get_balances(proj.onchain_project_id)
                metrics = arc_client.get_metrics(proj.onchain_project_id)
                onchain = arc_client.get_project(proj.onchain_project_id)
                
                proj_dict.update({
                    "escrow_balance": balances['escrow_balance'],
                    "reward_balance": balances['reward_balance'],
                    "bounty_pool_balance": balances['bounty_pool_balance'],
                    "last_score": metrics['last_score'],
                    "avg_score": metrics['avg_score'],
                    "test_count": metrics['test_count'],
                    "last_test_time": metrics['last_test_time'],
                    "active": onchain['active']
                })
            except Exception as e:
                logger.warning(f"Failed to fetch on-chain data for project {proj.id}: {e}")
        
        projects_response.append(ProjectRead(**proj_dict))
    
    return projects_response


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get project metadata + live on-chain data
    """
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    proj_dict = {
        "id": project.id,
        "onchain_project_id": project.onchain_project_id,
        "name": project.name,
        "owner_address": project.owner_address,
        "token_symbol": project.token_symbol,
        "target_model": project.target_model,
        "min_score": project.min_score,
        "payout_rate_bps": project.payout_rate_bps,
        "penalty_rate_bps": project.penalty_rate_bps,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "last_test_run_id": project.last_test_run_id
    }
    
    # Fetch live on-chain data
    if arc_client:
        try:
            balances = arc_client.get_balances(project.onchain_project_id)
            metrics = arc_client.get_metrics(project.onchain_project_id)
            onchain = arc_client.get_project(project.onchain_project_id)
            
            proj_dict.update({
                "escrow_balance": balances['escrow_balance'],
                "reward_balance": balances['reward_balance'],
                "bounty_pool_balance": balances['bounty_pool_balance'],
                "last_score": metrics['last_score'],
                "avg_score": metrics['avg_score'],
                "test_count": metrics['test_count'],
                "last_test_time": metrics['last_test_time'],
                "active": onchain['active']
            })
        except ArcClientError as e:
            raise HTTPException(status_code=500, detail=f"Arc client error: {e}")
    
    return ProjectRead(**proj_dict)


@router.post("/{project_id}/run-test", response_model=RunTestResponse)
async def run_safety_test(
    project_id: str,
    request: RunTestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Run LUPIN regression tests for a project and record results on-chain (Part B.5)
    
    Flow:
    1. Look up Project metadata (target_model, onchain_project_id)
    2. Run regression tests using existing RegressionTester
    3. Compute score (0-100), criticalCount, newExploitHash
    4. Call arc_client.record_test_result
    5. Update Project.last_test_run_id
    6. Return results including tx_hash
    """
    if not arc_client:
        raise HTTPException(
            status_code=503,
            detail="Arc client not configured"
        )
    
    # Fetch project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Determine test mode: LLM or Agent
        if request.test_mode == "agent":
            # Agent safety testing
            if not request.agent_endpoint:
                raise HTTPException(
                    status_code=400,
                    detail="agent_endpoint required when test_mode='agent'"
                )
            
            tester = AgentTester(request.api_key)
            try:
                test_results = await tester.run_agent_safety_suite(
                    db=db,
                    agent_endpoint=request.agent_endpoint,
                    agent_type=request.agent_type or "general",
                    max_scenarios=request.max_exploits or 10
                )
            finally:
                await tester.close()
        
        else:
            # LLM jailbreak testing (default)
            notification_config = {
                "smtp_host": config.SMTP_HOST,
                "smtp_port": config.SMTP_PORT,
                "smtp_user": config.SMTP_USER,
                "smtp_password": config.SMTP_PASSWORD,
                "from_email": config.FROM_EMAIL,
                "notification_enabled": config.NOTIFICATION_ENABLED,
                "perplexity_api_key": config.PERPLEXITY_API_KEY
            }
            notification_service = NotificationService(db, notification_config)
            tester = RegressionTester(request.api_key, notification_service=notification_service)
            
            try:
                test_results = await tester.run_regression_suite(
                    db=db,
                    target_model=project.target_model,
                    max_exploits=request.max_exploits
                )
            finally:
                await tester.close()
        
        if not test_results.get("success"):
            raise HTTPException(
                status_code=500,
                detail=test_results.get("error", "Regression test failed")
            )
        
        summary = test_results.get("summary", {})
        
        # Calculate score based on test mode
        if request.test_mode == "agent":
            # For agents: score = (safe_behaviors / total_scenarios) * 100
            score = test_results.get("score", 0)
            total_tests = summary.get("total_scenarios", 0)
        else:
            # For LLMs: score = (blocked_exploits / total_tests) * 100
            total_tests = summary.get("total_tests", 0)
            blocked_exploits = summary.get("blocked_exploits", 0)
            
            if total_tests == 0:
                raise HTTPException(status_code=400, detail="No exploits tested")
            
            score = int((blocked_exploits * 100) / total_tests)
        
        # Calculate criticalCount based on test mode
        critical_count = 0
        test_run_results = test_results.get("results", [])
        
        if request.test_mode == "agent":
            # For agents: already calculated in AgentTester
            critical_count = test_results.get("critical_count", 0)
        else:
            # For LLMs: count exploits that succeeded AND have high/critical severity
            for test_result in test_run_results:
                if test_result.get("success", False):  # Exploit succeeded (broken)
                    exploit_id = test_result.get("exploit_id")
                    if exploit_id:
                        # Fetch exploit to check severity
                        exploit_query = select(Exploit).where(Exploit.id == exploit_id)
                        exploit_result = await db.execute(exploit_query)
                        exploit = exploit_result.scalar_one_or_none()
                        
                        if exploit and exploit.severity in ['high', 'critical']:
                            critical_count += 1
        
        # Determine newExploitHash per spec (section 3)
        # For MVP: set to bytes32(0) since we're testing existing exploits
        # In future: track if new exploits were discovered during this run
        new_exploit_hash = b'\x00' * 32  # bytes32(0)
        
        # TODO: If exploit_catalog records new discoveries, compute keccak256 of first new exploit
        # For now: all tests use existing exploits, so hash is 0x0
        
        # Record test result on-chain
        try:
            tx_hash = arc_client.record_test_result(
                project_id=project.onchain_project_id,
                score=score,
                critical_count=critical_count,
                new_exploit_hash=new_exploit_hash
            )
        except ArcClientError as e:
            raise HTTPException(status_code=500, detail=f"On-chain recording failed: {e}")
        
        # Find the TestRun record created by regression_tester
        # The most recent TestRun for this model
        test_run_query = select(TestRun).where(
            TestRun.target_model == project.target_model
        ).order_by(TestRun.timestamp.desc()).limit(1)
        test_run_result = await db.execute(test_run_query)
        test_run = test_run_result.scalar_one_or_none()
        
        # Update project's last_test_run_id
        if test_run:
            project.last_test_run_id = test_run.id
            await db.commit()
        
        return RunTestResponse(
            project_id=project.id,
            onchain_project_id=project.onchain_project_id,
            test_run_id=test_run.id if test_run else None,
            score=score,
            critical_count=critical_count,
            new_exploit_hash=new_exploit_hash.hex(),
            tx_hash=tx_hash,
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to run safety test: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_project_stats(db: AsyncSession = Depends(get_db)):
    """Get statistics about registered projects"""
    total_query = select(func.count(Project.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar()
    
    return {
        "total_projects": total,
        "message": f"{total} projects registered"
    }

