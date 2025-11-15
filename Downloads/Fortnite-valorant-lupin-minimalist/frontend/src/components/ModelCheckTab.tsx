import { useEffect, useState, useRef } from 'react'
import './ModelCheckTab.css'
import { getStoredAPIKeys } from './SettingsTab'

interface RegressionSummary {
  total_tests: number
  successful_exploits: number
  blocked_exploits: number
  safety_score: number
  avg_execution_time_ms: number
}

interface RegressionResult {
  summary?: RegressionSummary
  [key: string]: any
}

interface HistoryEntry {
  date: string
  total_tests: number
  safety_score: number
}

interface ManualMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ManualModelState {
  model: string
  jailbroken: boolean
  jailbreak_prompt: string | null
}

export default function ModelCheckTab() {
  const [targetModel, setTargetModel] = useState('z-ai/glm-4.5-air:free')
  const [apiKey, setApiKey] = useState('')
  const [testRunning, setTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<RegressionResult | null>(null)
  const [testHistory, setTestHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [lastRunMeta, setLastRunMeta] = useState<{ timestamp: string; model: string } | null>(null)
  const [exploitSampleSize, setExploitSampleSize] = useState(20)
  const [panelMode, setPanelMode] = useState<'automated' | 'manual'>('automated')
  const [manualMessages, setManualMessages] = useState<ManualMessage[]>([])
  const [manualInput, setManualInput] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualModelState, setManualModelState] = useState<ManualModelState>({
    model: 'z-ai/glm-4.5-air:free',
    jailbroken: false,
    jailbreak_prompt: null
  })
  const [manualModelInput, setManualModelInput] = useState('z-ai/glm-4.5-air:free')
  const [manualModelDraftTouched, setManualModelDraftTouched] = useState(false)
  const manualMessagesEndRef = useRef<HTMLDivElement | null>(null)

  const clampSampleSize = (value: number) => {
    if (Number.isNaN(value)) {
      return exploitSampleSize
    }
    return Math.min(100, Math.max(5, value))
  }

  useEffect(() => {
    fetchManualModelState()
    fetchExternalState()
    const interval = setInterval(() => {
      fetchManualModelState()
      fetchExternalState()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    manualMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [manualMessages])

  const fetchTestHistory = async (trigger: 'init' | 'manual' | 'after-run' = 'manual') => {
    const model = targetModel.trim()
    if (!model) {
      if (trigger !== 'init') {
        alert('Enter a target model before refreshing history.')
      }
      return
    }

    setHistoryLoading(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/exploits/regression-test/history?days=30&target_model=${encodeURIComponent(model)}`
      )
      const data = await response.json()
      setTestHistory(data.timeline || [])
    } catch (error) {
      console.error('Failed to fetch test history:', error)
      if (trigger !== 'init') {
        alert('Failed to fetch test history.')
      }
    }
    setHistoryLoading(false)
  }

  const runSafetyTest = async () => {
    if (!targetModel.trim() || !apiKey.trim()) {
      alert('Please provide both a target model and OpenRouter API key.')
      return
    }

    setTestRunning(true)
    setTestResults(null)
    setRunError(null)

    try {
      const response = await fetch('http://localhost:8000/api/exploits/regression-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_model: targetModel,
          api_key: apiKey,
          max_exploits: exploitSampleSize
        })
      })
      const data = await response.json()

      if (!response.ok) {
        setRunError(data.detail || 'Safety test failed. Check backend logs.')
        return
      }

      if (data.success === false || !data.summary) {
        setRunError(data.error || 'No exploits available to test yet. Add some in the tracker first.')
        return
      }

      setTestResults(data)
      setRunError(null)
      setLastRunMeta({
        timestamp: new Date().toLocaleTimeString(),
        model: targetModel.trim()
      })
      fetchTestHistory('after-run')
    } catch (error) {
      console.error('Safety test failed:', error)
      alert('Safety test failed: ' + error)
    } finally {
      setTestRunning(false)
    }
  }

  useEffect(() => {
    const storedKeys = getStoredAPIKeys()
    if (storedKeys.openrouter) {
      setApiKey(storedKeys.openrouter)
    }
    fetchTestHistory('init')
  }, [])

  const fetchManualModelState = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/target-model-state')
      const data = await response.json()
      setManualModelState(data)
      if (!manualModelDraftTouched) {
        setManualModelInput(data.model)
      }
    } catch (error) {
      console.error('Failed to fetch target model state:', error)
    }
  }

  const fetchExternalState = async () => {
    try {
      console.log('[EXTERNAL_STATE] Fetching external LLM state')
      const response = await fetch('http://localhost:8000/api/chat/external-state')
      const data = await response.json()
      console.log('[EXTERNAL_STATE] Received state:', data)

      // Update manual model state if external LLM is connected
      if (data.connected && data.model) {
        setManualModelState(prev => ({
          ...prev,
          model: data.model,
          jailbroken: data.connected
        }))
        if (!manualModelDraftTouched) {
          setManualModelInput(data.model)
        }
      }
    } catch (error) {
      console.error('Failed to fetch external state:', error)
    }
  }

  const clearExternalHistory = async () => {
    try {
      console.log('[EXTERNAL_CLEAR] Clearing external LLM history')
      const response = await fetch('http://localhost:8000/api/chat/external-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      console.log('[EXTERNAL_CLEAR] History cleared:', data)

      // Clear local messages too
      setManualMessages([])

      // Fetch updated state
      fetchExternalState()
    } catch (error) {
      console.error('Failed to clear external history:', error)
      alert('Failed to clear conversation history.')
    }
  }

  const handleManualModelUpdate = async () => {
    const trimmed = manualModelInput.trim()
    if (!trimmed) {
      alert('Enter a model identifier (provider/model-name).')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/chat/set-target-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: trimmed })
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.detail || 'Failed to update target model.')
        return
      }

      const updated = await response.json()
      setManualModelState(updated)
      setManualModelInput(updated.model)
      setManualModelDraftTouched(false)
    } catch (error) {
      console.error('Failed to update target model:', error)
      alert('Unable to update target model.')
    }
  }

  const sendManualMessage = async () => {
    if (!manualInput.trim() || manualLoading) return

    const userMessage: ManualMessage = {
      role: 'user',
      content: manualInput,
      timestamp: new Date()
    }

    setManualMessages((prev) => [...prev, userMessage])
    setManualInput('')
    setManualLoading(true)

    try {
      console.log('[MANUAL_CHAT] Sending direct message to external LLM')
      const response = await fetch('http://localhost:8000/api/chat/external-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content
        })
      })

      const data = await response.json()
      console.log('[MANUAL_CHAT] Received response:', data)

      if (!response.ok) {
        throw new Error(data.detail || 'External chat failed')
      }

      const assistantMessage: ManualMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }
      setManualMessages((prev) => [...prev, assistantMessage])

      // Fetch updated state after successful message
      fetchExternalState()
    } catch (error) {
      console.error('[MANUAL_CHAT] Error:', error)
      const errorMessage: ManualMessage = {
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date()
      }
      setManualMessages((prev) => [...prev, errorMessage])
    } finally {
      setManualLoading(false)
    }
  }

  const manualModelDisplayName = () => {
    const name = manualModelState.model?.split('/')[1] || manualModelState.model
    return name?.split(':')[0] || manualModelState.model
  }

  const handleManualModelInputChange = (value: string) => {
    setManualModelInput(value)
    setManualModelDraftTouched(true)
  }


  return (
    <div className="model-check-tab">
      <div className="model-check-header">
        <h2>Test Your LLM</h2>
        <p className="mode-description">
          {panelMode === 'automated'
            ? `Run an automated sweep of ${exploitSampleSize} stored exploits against your selected model to log safety metrics—enter the model + key, then press RUN SAFETY TEST.`
            : 'Use the manual probe to chat directly with any OpenRouter model; set the target identifier and send prompts to test responses in real time.'}
        </p>
      </div>
      <div className="model-check-tabs">
        <button
          className={panelMode === 'automated' ? 'active' : ''}
          onClick={() => setPanelMode('automated')}
        >
          Automated Safety Test
        </button>
        <button
          className={panelMode === 'manual' ? 'active' : ''}
          onClick={() => setPanelMode('manual')}
        >
          Manual Probe
        </button>
      </div>

      {panelMode === 'automated' && (
        <>
          <div className="model-check-controls">
            <div className="input-group">
              <label>Target Model</label>
              <input
                type="text"
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value)}
                placeholder="e.g., z-ai/glm-4.5-air:free"
              />
            </div>

            <div className="input-group">
              <label>OpenRouter API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
            </div>

            <div className="model-check-actions">
              <button className="btn-test" onClick={runSafetyTest} disabled={testRunning}>
                {testRunning ? 'RUNNING SAFETY TEST...' : 'RUN SAFETY TEST'}
              </button>
              <button
                className="btn-refresh"
                type="button"
                onClick={() => fetchTestHistory('manual')}
                disabled={historyLoading}
              >
                {historyLoading ? 'REFRESHING...' : 'REFRESH HISTORY'}
              </button>
            </div>
            <div className="sample-size-note">
              <label>Exploit Sample Size</label>
              <input
                type="number"
                min={5}
                max={100}
                step={5}
                value={exploitSampleSize}
                onChange={(e) => setExploitSampleSize(clampSampleSize(Number(e.target.value)))}
              />
              <span className="note">
                Runs the latest {exploitSampleSize} stored exploits to keep checks fast.
              </span>
            </div>
          </div>

          {testRunning && (
            <div className="model-check-alert info">
              Running the latest {exploitSampleSize} exploits against {targetModel}… this can take a minute.
            </div>
          )}

          {runError && (
            <div className="model-check-alert error">
              <strong>Run blocked:</strong> {runError}
            </div>
          )}

          {!runError && testResults?.summary && (
            <div className="model-check-alert info">
              <div>
                Checked {testResults.summary.total_tests} stored exploits against{' '}
                {lastRunMeta?.model || targetModel}.
              </div>
              <div>
                {testResults.summary.blocked_exploits} were blocked • {testResults.summary.successful_exploits} slipped
                through • Safety score {testResults.summary.safety_score}%.
              </div>
            </div>
          )}

          {testResults?.summary && (
            <div className="model-check-results">
              <h3>Latest Run Snapshot</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">{testResults.summary.total_tests}</div>
                  <div className="metric-label">Total Tests</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: '#dc3545' }}>
                    {testResults.summary.successful_exploits}
                  </div>
                  <div className="metric-label">Successful Exploits</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: '#28a745' }}>
                    {testResults.summary.blocked_exploits}
                  </div>
                  <div className="metric-label">Blocked Exploits</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value" style={{ color: '#0066cc' }}>
                    {testResults.summary.safety_score}%
                  </div>
                  <div className="metric-label">Safety Score</div>
                </div>
              </div>
            </div>
          )}

          {testHistory.length > 0 && (
            <div className="model-check-history">
              <h3>History (Last 30 Days)</h3>
              <div className="history-timeline">
                {testHistory.map((entry, idx) => (
                  <div key={`${entry.date}-${idx}`} className="history-entry">
                    <div className="history-date">{entry.date}</div>
                    <div className="history-metrics">
                      <span>Tests: {entry.total_tests}</span>
                      <span className="history-score">Safety Score: {entry.safety_score}%</span>
                    </div>
                    <div className="history-bar">
                      <div
                        className="history-bar-fill"
                        style={{
                          width: `${entry.safety_score}%`,
                          background:
                            entry.safety_score >= 80
                              ? '#28a745'
                              : entry.safety_score >= 50
                                ? '#ffc107'
                                : '#dc3545'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testHistory.length === 0 && !historyLoading && (
          <div className="history-empty">
            No recorded safety runs yet. Start a test run to log daily results.
            </div>
          )}
        </>
      )}

      {panelMode === 'manual' && (
        <div className="manual-probe-panel">
          <div className="manual-header">
            <div>
              <h3>Manual Probe</h3>
            </div>
            <div className="manual-model-form">
              <label>Model Identifier</label>
              <div className="manual-model-input-row">
                <input
                  type="text"
                  value={manualModelInput}
                  onChange={(e) => handleManualModelInputChange(e.target.value)}
                  placeholder="provider/model-name"
                />
                <button onClick={handleManualModelUpdate}>Set Model</button>
              </div>
            </div>
          </div>

          <div className="manual-status">
            <span className="badge">Active: {manualModelState.model}</span>
            <span className={`status ${manualModelState.jailbroken ? 'bad' : 'good'}`}>
              {manualModelState.jailbroken ? 'Jailbreak applied' : 'No jailbreak stored'}
            </span>
            {manualMessages.length > 0 && (
              <button className="btn-clear" onClick={clearExternalHistory} title="Clear conversation history">
                Clear History
              </button>
            )}
          </div>

          <div className="manual-chat-window">
            {manualMessages.length === 0 && (
              <div className="manual-empty">
                Start a conversation with {manualModelDisplayName()} to test prompts manually.
              </div>
            )}
            {manualMessages.map((message, idx) => (
              <div key={`${message.timestamp.getTime()}-${idx}`} className={`manual-message ${message.role}`}>
                <div className="meta">
                  {message.role === 'user' ? 'You' : manualModelDisplayName()} •{' '}
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <div className="content">{message.content}</div>
              </div>
            ))}
            {manualLoading && <div className="manual-empty">Model is typing…</div>}
            <div ref={manualMessagesEndRef} />
          </div>

          <div className="manual-input-row">
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendManualMessage()
                }
              }}
              placeholder={`Message ${manualModelDisplayName()}…`}
              disabled={manualLoading}
              rows={3}
            />
            <button onClick={sendManualMessage} disabled={manualLoading}>
              {manualLoading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
