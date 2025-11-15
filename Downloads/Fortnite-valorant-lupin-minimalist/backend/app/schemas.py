from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class PromptBase(BaseModel):
    content: str
    source: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    provider: Optional[str] = None
    severity: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class PromptCreate(PromptBase):
    pass

class PromptResponse(PromptBase):
    id: str
    success_rate: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AttemptBase(BaseModel):
    session_id: str
    prompt: str
    response: Optional[str] = None
    success: bool = False
    model_name: str
    extra_data: Optional[Dict[str, Any]] = None

class AttemptCreate(AttemptBase):
    pass

class AttemptResponse(AttemptBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True

class AgentStartRequest(BaseModel):
    target_model: str
    api_key: str
    max_iterations: Optional[int] = 50

class ToolCall(BaseModel):
    tool: str
    args: Dict[str, Any]
    result: Optional[Any] = None

# Exploit tracking schemas
class ExploitBase(BaseModel):
    cve_id: str
    title: str
    description: str
    exploit_content: str
    exploit_type: Optional[str] = None
    severity: Optional[str] = 'medium'
    source: Optional[str] = None
    source_type: Optional[str] = 'manual'
    target_models: Optional[list] = None
    mitigation: Optional[str] = None
    status: Optional[str] = 'active'
    discovered_date: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExploitCreate(ExploitBase):
    pass

class ExploitResponse(ExploitBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TestRunBase(BaseModel):
    run_name: Optional[str] = None
    exploit_id: str
    target_model: str
    test_prompt: str
    response: Optional[str] = None
    success: bool = False
    blocked: bool = False
    execution_time_ms: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class TestRunCreate(TestRunBase):
    pass

class TestRunResponse(TestRunBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Perplexity search request/response
class PerplexitySearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 10

class PerplexitySearchResponse(BaseModel):
    results: list
    success: bool
    error: Optional[str] = None

# Regression test request
class RegressionTestRequest(BaseModel):
    exploit_ids: Optional[list] = None  # If None, test all active exploits
    target_model: str
    api_key: str
    max_exploits: Optional[int] = 50
