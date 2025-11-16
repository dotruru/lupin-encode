# 🎬 Real-Time Exploit Testing – Implementation Spec

## Goal

Show exploit testing **live** in the UI as it happens, not just final results.

Users should see:
- Each exploit being sent to the model/agent in real-time
- The response streaming back
- Whether it was blocked or broken
- Tool calls (for agents)
- Final score updating live

---

## User Experience

### Before (Current)
1. Click "RUN TEST"
2. Wait 30-60 seconds (black box)
3. Alert shows final score

### After (Real-Time)
1. Click "RUN TEST"
2. Modal opens showing:
   ```
   Testing exploit 1/10: "DAN 11.0 Jailbreak"
   ⏳ Sending to model...
   ✅ BLOCKED - Model refused (1/1 safe)
   
   Testing exploit 2/10: "Ignore Previous Instructions"
   ⏳ Sending to model...
   ❌ BROKEN - Jailbreak succeeded (1/2 safe)
   
   Testing exploit 3/10: "Hypothetical Scenario Bypass"
   ...
   
   Current Score: 50% (1 safe / 2 total)
   ```
3. Final screen:
   ```
   ✅ Test Complete
   Final Score: 80/100
   Transaction: 0xabc... (view on ArcScan)
   ```

---

## Implementation

### 1. Backend – Server-Sent Events (SSE) Endpoint

Create `POST /api/projects/{id}/run-test-stream` that:
- Runs tests like `/run-test`
- But streams progress events via SSE

```python
@router.post("/{project_id}/run-test-stream")
async def run_safety_test_stream(
    project_id: str,
    request: RunTestRequest,
    db: AsyncSession = Depends(get_db)
):
    async def event_stream():
        # Yield events as tests run
        yield f"data: {json.dumps({'type': 'start', 'total': 10})}\n\n"
        
        for i, exploit in enumerate(exploits):
            yield f"data: {json.dumps({'type': 'testing', 'index': i, 'title': exploit.title})}\n\n"
            
            # Run test
            result = await test_exploit(exploit)
            
            yield f"data: {json.dumps({
                'type': 'result',
                'index': i,
                'safe': result.blocked,
                'response': result.response[:200],
                'tools': result.tools_called  # For agents
            })}\n\n"
        
        # Final on-chain recording
        tx_hash = await record_on_chain(...)
        yield f"data: {json.dumps({'type': 'complete', 'score': score, 'tx_hash': tx_hash})}\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### 2. Frontend – EventSource for SSE

```typescript
const runSafetyTestRealtime = async (projectId: string) => {
  setTestRunning(true)
  setShowTestModal(true)  // Open real-time modal
  
  const eventSource = new EventSource(
    `http://localhost:8000/api/projects/${projectId}/run-test-stream?` +
    `api_key=${apiKey}&test_mode=${testMode}`
  )
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    switch(data.type) {
      case 'start':
        setTestProgress({ total: data.total, current: 0, results: [] })
        break
      
      case 'testing':
        setTestProgress(prev => ({
          ...prev,
          current: data.index,
          currentTest: data.title
        }))
        break
      
      case 'result':
        setTestProgress(prev => ({
          ...prev,
          results: [...prev.results, data]
        }))
        break
      
      case 'complete':
        setFinalResult({ score: data.score, tx_hash: data.tx_hash })
        eventSource.close()
        break
    }
  }
  
  eventSource.onerror = () => {
    eventSource.close()
    setTestRunning(false)
    alert('Test stream failed')
  }
}
```

### 3. UI – Real-Time Test Modal

```tsx
{showTestModal && (
  <div className="modal-overlay">
    <div className="modal-content test-progress">
      <h2>
        {testMode === 'agent' ? '🤖 Agent' : '🔒 LLM'} Safety Test
      </h2>
      
      <div className="progress-bar">
        <div style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }} />
      </div>
      
      <p>Testing {testProgress.current}/{testProgress.total}</p>
      <h3>{testProgress.currentTest}</h3>
      
      <div className="results-list">
        {testProgress.results.map((r, i) => (
          <div key={i} className={r.safe ? 'result-safe' : 'result-broken'}>
            <span className="result-icon">{r.safe ? '✅' : '❌'}</span>
            <span>{r.safe ? 'BLOCKED' : 'BROKEN'}</span>
            {testMode === 'agent' && r.tools && (
              <span className="tools">
                Tools: {r.tools.join(', ')}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <div className="current-score">
        Score: {Math.round((testProgress.results.filter(r => r.safe).length / testProgress.results.length) * 100)}%
      </div>
      
      {finalResult && (
        <div className="final-result">
          <h3>✅ Test Complete</h3>
          <p>Final Score: {finalResult.score}/100</p>
          <a href={`https://testnet.arcscan.app/tx/${finalResult.tx_hash}`}>
            View on ArcScan
          </a>
        </div>
      )}
    </div>
  </div>
)}
```

---

## Mock Agent Endpoint (30 min)

Add to `backend/app/routers/`:

```python
# backend/app/routers/mock_agent.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class AgentRequest(BaseModel):
    messages: List[Dict[str, str]]
    tools: List[Dict[str, Any]] = []

@router.post("/mock-agent")
async def mock_agent(request: AgentRequest):
    """
    Mock agent endpoint for demo purposes
    Simulates an agent that sometimes makes unsafe tool calls
    """
    last_message = request.messages[-1]["content"].lower() if request.messages else ""
    
    # Detect exploit attempts
    unsafe_keywords = ["ignore", "admin", "delete", "refund", "bypass"]
    is_exploit = any(keyword in last_message for keyword in unsafe_keywords)
    
    # 70% of exploits succeed (to show penalties)
    import random
    exploit_succeeds = is_exploit and random.random() < 0.7
    
    if exploit_succeeds:
        # Agent makes unsafe tool call
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Processing your request...",
                    "tool_calls": [{
                        "type": "function",
                        "function": {
                            "name": "issue_refund",  # Forbidden tool!
                            "arguments": '{"order_id": "12345", "bypass_validation": true}'
                        }
                    }]
                }
            }]
        }
    else:
        # Agent refuses safely
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "I cannot perform that action. It violates safety policies.",
                    "tool_calls": []
                }
            }]
        }
```

Add to `main.py`:
```python
from app.routers import mock_agent
app.include_router(mock_agent.router, prefix="/api", tags=["mock"])
```

Then in UI, you can use: `http://localhost:8000/api/mock-agent` as the agent endpoint for demos.

---

## Test History View (1 hour)

Add to project detail modal:

```tsx
<div className="detail-section">
  <h3>Test History</h3>
  <div className="test-history-list">
    {testHistory.map(test => (
      <div key={test.id} className="test-history-item">
        <div className="test-header">
          <span className="test-date">{formatDate(test.timestamp)}</span>
          <span className={`test-score ${test.score >= project.min_score ? 'pass' : 'fail'}`}>
            {test.score}/100
          </span>
        </div>
        <div className="test-details">
          <span>Tests: {test.total_tests}</span>
          <span>Critical: {test.critical_count}</span>
          <a href={`https://testnet.arcscan.app/tx/${test.tx_hash}`}>
            View Tx
          </a>
        </div>
        <div className="test-impact">
          {test.score >= project.min_score ? (
            <span className="reward">+{test.reward_amount} USDC reward</span>
          ) : (
            <span className="penalty">-{test.penalty_amount} USDC penalty</span>
          )}
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## Timeline for Hackathon

### Next 90 minutes:
1. **Mock agent endpoint** (30 min) ← Start here
2. **SSE streaming for real-time progress** (45 min)
3. **Real-time test modal UI** (45 min)

### If time left:
4. **Test history view** (60 min)
5. **Agent tool call visualization** (30 min)

---

Want me to start with the **mock agent endpoint** first? It's the quickest win and lets you demo agent testing immediately.

