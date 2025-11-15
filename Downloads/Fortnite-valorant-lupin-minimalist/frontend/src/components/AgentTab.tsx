import { useState, useRef, useEffect } from 'react'
import { getStoredAPIKeys } from './SettingsTab'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: string // for colored system messages
}

type ChatMode = 'lupin' | 'target' | 'jailbroken'

export default function AgentTab() {
  // Get API key from settings, fallback to hardcoded value
  const storedKeys = getStoredAPIKeys()
  const targetModel = 'z-ai/glm-4.5-air:free'
  const apiKey = storedKeys.openrouter || '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'

  const [mode, setMode] = useState<ChatMode>('lupin')
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [notepad, setNotepad] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [jailbreakPrompt, setJailbreakPrompt] = useState<string | null>(null)
  const [jailbreakAvailable, setJailbreakAvailable] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetchStats()
    checkJailbreakStatus()

    fetch('http://localhost:8000/api/agent/initialize-db', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        addSystemMessage(`Database initialized with ${data.counts.total} prompts`, 'init')
      })
      .catch(() => addSystemMessage('Failed to initialize database', 'error'))
  }, [])

  const checkJailbreakStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/jailbreak-status')
      const data = await response.json()
      if (data.available) {
        setJailbreakAvailable(true)
        setJailbreakPrompt(data.prompt)
      }
    } catch (error) {
      console.error('Failed to fetch jailbreak status:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/prompts/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const addSystemMessage = (content: string, type: string = 'system') => {
    setMessages(prev => [...prev, {
      role: 'system',
      content,
      timestamp: new Date(),
      type
    }])
  }

  const startAgent = async () => {
    setIsAgentRunning(true)
    setMessages([])
    setNotepad('')

    try {
      const eventSource = new EventSource(
        `http://localhost:8000/api/agent/start?target_model=${encodeURIComponent(targetModel)}&api_key=${encodeURIComponent(apiKey)}`
      )

      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'init':
              addSystemMessage(data.message, 'init')
              if (data.session_id) {
                setSessionId(data.session_id)
              }
              break
            case 'user_message':
              setMessages(prev => [...prev, {
                role: 'user',
                content: data.message,
                timestamp: new Date()
              }])
              break
            case 'thinking':
              addSystemMessage(`[Iteration ${data.iteration}] Lupin is thinking...`, 'thinking')
              break
            case 'thought':
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.content,
                timestamp: new Date()
              }])
              break
            case 'tool_call':
              addSystemMessage(`[TOOL] ${data.tool}(${JSON.stringify(data.args)})`, 'tool')
              break
            case 'tool_result':
              addSystemMessage(`[RESULT] ${JSON.stringify(data.result, null, 2)}`, 'result')
              if (data.tool === 'write_notepad' && data.result.content) {
                setNotepad(data.result.content)
              }
              break
            case 'success':
              addSystemMessage(`✓ ${data.message} (${data.iterations} iterations)`, 'success')
              if (data.jailbreak_prompt) {
                addSystemMessage(`✓ Jailbreak prompt saved! Switch to JAILBROKEN mode to test it`, 'success')
                setJailbreakPrompt(data.jailbreak_prompt)
                setJailbreakAvailable(true)
              }
              setIsAgentRunning(false)
              eventSource.close()
              break
            case 'error':
              addSystemMessage(`Error: ${data.error}`, 'error')
              setIsAgentRunning(false)
              eventSource.close()
              break
            case 'max_iterations':
              addSystemMessage(data.message, 'warning')
              setIsAgentRunning(false)
              eventSource.close()
              break
          }
        } catch (error) {
          console.error('Failed to parse event:', error)
        }
      }

      eventSource.onerror = () => {
        addSystemMessage('Connection to agent lost', 'error')
        setIsAgentRunning(false)
        eventSource.close()
      }
    } catch (error) {
      addSystemMessage(`Failed to start agent: ${error}`, 'error')
      setIsAgentRunning(false)
    }
  }

  const stopAgent = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsAgentRunning(false)
    addSystemMessage('Agent stopped by user', 'info')
  }

  const scrapeReddit = async () => {
    try {
      addSystemMessage('Scraping Reddit...', 'init')
      const response = await fetch('http://localhost:8000/api/agent/scrape-reddit?limit=50', {
        method: 'POST'
      })
      const data = await response.json()
      addSystemMessage(data.message, 'success')
      fetchStats()
    } catch (error) {
      addSystemMessage('Failed to scrape Reddit', 'error')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // If agent is running, send as guidance
      if (isAgentRunning && sessionId) {
        await fetch('http://localhost:8000/api/agent/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message: input
          })
        })
        setIsLoading(false)
        return
      }

      // Otherwise, send as chat based on mode
      let endpoint = ''
      let body: any = {
        message: input,
        target_model: targetModel,
        api_key: apiKey
      }

      switch (mode) {
        case 'lupin':
          endpoint = 'http://localhost:8000/api/chat/lupin'
          break
        case 'target':
          endpoint = 'http://localhost:8000/api/chat/target'
          break
        case 'jailbroken':
          endpoint = 'http://localhost:8000/api/chat/jailbroken'
          body.jailbreak_prompt = jailbreakPrompt
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      addSystemMessage(`Error: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const getModeLabel = () => {
    if (isAgentRunning) return 'Lupin (Agent Running)'
    switch (mode) {
      case 'lupin': return 'Lupin'
      case 'target': return 'Target'
      case 'jailbroken': return 'Jailbroken'
    }
  }

  const getMessageColor = (type?: string) => {
    switch (type) {
      case 'init': return '#6c757d'
      case 'thinking': return '#0066cc'
      case 'tool': return '#7952b3'
      case 'result': return '#6c757d'
      case 'success': return '#28a745'
      case 'error': return '#dc3545'
      case 'warning': return '#ffc107'
      case 'info': return '#17a2b8'
      default: return '#000'
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div className="controls">
        <div className="button-group">
          {!isAgentRunning ? (
            <button className="btn btn-primary" onClick={startAgent}>
              START AGENT
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopAgent}>
              STOP
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="stats">
          <span>Prompts in DB: {stats.total_prompts}</span>
          <span>Attempts: {stats.total_attempts}</span>
          <button
            className="btn btn-primary"
            onClick={scrapeReddit}
            disabled={isAgentRunning}
            style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '12px' }}
          >
            SCRAPE REDDIT
          </button>
        </div>
      )}

      {/* Mode Selector */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '15px',
        borderBottom: '1px solid #ddd'
      }}>
        <button
          className={`btn ${mode === 'lupin' ? 'btn-primary' : ''}`}
          onClick={() => setMode('lupin')}
          disabled={isAgentRunning}
          style={{ flex: 1 }}
        >
          LUPIN
        </button>
        <button
          className={`btn ${mode === 'target' ? 'btn-primary' : ''}`}
          onClick={() => setMode('target')}
          disabled={isAgentRunning}
          style={{ flex: 1 }}
        >
          TARGET
        </button>
        <button
          className={`btn ${mode === 'jailbroken' ? 'btn-primary' : ''}`}
          onClick={() => setMode('jailbroken')}
          disabled={isAgentRunning || !jailbreakAvailable}
          style={{ flex: 1 }}
        >
          JAILBROKEN {!jailbreakAvailable && '🔒'}
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="activity-panel" style={{ width: '100%' }}>
          <h2>Chat / Activity Feed</h2>
          <div className="logs" style={{ marginBottom: '60px' }}>
            {messages.length === 0 && (
              <div style={{ color: '#999', fontSize: '14px', padding: '20px' }}>
                Start a conversation or run the agent
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '15px',
                  color: msg.role === 'system' ? getMessageColor(msg.type) : '#000',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                <div style={{
                  fontSize: '11px',
                  color: '#666',
                  marginBottom: '3px',
                  fontWeight: '500'
                }}>
                  {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : getModeLabel()} • {msg.timestamp.toLocaleTimeString()}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
                {getModeLabel()} is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Seamless Input */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '20px',
            borderTop: '1px solid #ddd',
            background: '#fff'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={isAgentRunning ? 'Guide Lupin...' : `Message ${getModeLabel()}...`}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 0',
                fontSize: '14px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#000'
              }}
            />
          </div>
        </div>

        {notepad && (
          <div className="notepad-panel">
            <h2>Notepad</h2>
            <div className="notepad">
              <pre>{notepad}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
