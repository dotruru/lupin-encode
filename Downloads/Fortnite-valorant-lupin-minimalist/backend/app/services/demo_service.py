"""
Demo service for showcase mode - allows testing without API keys
"""
import random
import asyncio
from typing import List, Dict, Any

class DemoService:
    """Mock service that simulates AI safety tests for demo purposes"""
    
    DEMO_SCENARIOS = [
        {
            "title": "SQL Injection via Prompt",
            "description": "Attempts to inject SQL commands through user prompt",
            "safe": False,
            "critical": True
        },
        {
            "title": "Data Exfiltration Request",
            "description": "Tries to extract sensitive user data",
            "safe": False,
            "critical": True
        },
        {
            "title": "Goal Hijacking Attempt",
            "description": "Attempts to override agent's primary objective",
            "safe": True,
            "critical": False
        },
        {
            "title": "Tool Misuse - File Deletion",
            "description": "Tries to make agent delete system files",
            "safe": False,
            "critical": True
        },
        {
            "title": "Jailbreak via Role Play",
            "description": "Uses role-playing to bypass safety guardrails",
            "safe": True,
            "critical": False
        },
        {
            "title": "Hidden Command Injection",
            "description": "Embeds malicious commands in seemingly innocent request",
            "safe": False,
            "critical": False
        },
        {
            "title": "API Key Extraction",
            "description": "Attempts to retrieve API credentials",
            "safe": True,
            "critical": False
        },
        {
            "title": "Unauthorized Fund Transfer",
            "description": "Tries to initiate financial transactions",
            "safe": False,
            "critical": True
        },
        {
            "title": "System Command Execution",
            "description": "Attempts to run shell commands",
            "safe": True,
            "critical": False
        },
        {
            "title": "Privacy Violation Request",
            "description": "Asks for personal information of other users",
            "safe": True,
            "critical": False
        }
    ]
    
    @classmethod
    async def run_demo_test(cls, test_mode: str = "failing") -> Dict[str, Any]:
        """
        Run a simulated test with predetermined outcomes
        
        Args:
            test_mode: "passing" (90% safe), "failing" (30% safe), or "mixed" (60% safe)
        """
        scenarios = cls.DEMO_SCENARIOS.copy()
        random.shuffle(scenarios)
        
        # Determine safety rates based on mode
        if test_mode == "passing":
            safe_rate = 0.9
        elif test_mode == "failing":
            safe_rate = 0.3
        else:  # mixed
            safe_rate = 0.6
        
        results = []
        critical_count = 0
        safe_count = 0
        
        for i, scenario in enumerate(scenarios):
            # Override safety based on mode
            is_safe = random.random() < safe_rate
            
            # For failing mode, ensure some critical failures
            if test_mode == "failing" and scenario["critical"] and i < 4:
                is_safe = False
            
            result = {
                "title": scenario["title"],
                "description": scenario["description"],
                "safe": is_safe,
                "critical": scenario["critical"] and not is_safe
            }
            
            if result["safe"]:
                safe_count += 1
            elif result["critical"]:
                critical_count += 1
            
            results.append(result)
            
            # Simulate processing time
            await asyncio.sleep(0.3)
        
        score = int((safe_count / len(scenarios)) * 100)
        
        return {
            "results": results,
            "summary": {
                "total_tests": len(scenarios),
                "safe_behaviors": safe_count,
                "unsafe_behaviors": len(scenarios) - safe_count,
                "critical_failures": critical_count,
                "score": score
            }
        }
    
    @classmethod
    def calculate_usdc_flow(cls, score: int, min_score: int, 
                           escrow: float, payout_rate: float, penalty_rate: float) -> Dict[str, float]:
        """
        Calculate USDC movements based on test results
        
        Returns dict with:
        - escrow_change: Amount leaving escrow
        - rewards_change: Amount entering rewards
        - bounty_change: Amount entering bounty pool
        - total_penalty: Total USDC lost (for failing)
        """
        if score >= min_score:
            # Passing: escrow -> rewards
            payout = escrow * (payout_rate / 100)
            return {
                "escrow_change": -payout,
                "rewards_change": payout,
                "bounty_change": 0,
                "total_penalty": 0
            }
        else:
            # Failing: escrow -> bounty (penalty)
            penalty = escrow * (penalty_rate / 100)
            return {
                "escrow_change": -penalty,
                "rewards_change": 0,
                "bounty_change": penalty,
                "total_penalty": penalty
            }
