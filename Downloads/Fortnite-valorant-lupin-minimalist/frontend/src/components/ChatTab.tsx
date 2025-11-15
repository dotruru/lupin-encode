import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type ChatMode = 'lupin' | 'target' | 'jailbroken'

export default function ChatTab() {
  // Hardcoded values
  const targetModel = 'z-ai/glm-4.5-air:free'
  const apiKey = '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'

  const [mode, setMode] = useState<ChatMode>('lupin')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [jailbreakPrompt, setJailbreakPrompt] = useState<string | null>(null)
  const [jailbreakAvailable, setJailbreakAvailable] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Check if jailbreak is available
    fetchJailbreakStatus()
  }, [])

  const fetchJailbreakStatus = async () => {
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
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'lupin': return 'Lupin'
      case 'target': return 'Target'
      case 'jailbroken': return 'Jailbroken'
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff'
    }}>
      {/* Mode Selector - Minimal */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '15px',
        borderBottom: '1px solid #ddd'
      }}>
        <button
          className={`btn ${mode === 'lupin' ? 'btn-primary' : ''}`}
          onClick={() => setMode('lupin')}
          style={{ flex: 1 }}
        >
          LUPIN
        </button>
        <button
          className={`btn ${mode === 'target' ? 'btn-primary' : ''}`}
          onClick={() => setMode('target')}
          style={{ flex: 1 }}
        >
          TARGET
        </button>
        <button
          className={`btn ${mode === 'jailbroken' ? 'btn-primary' : ''}`}
          onClick={() => setMode('jailbroken')}
          disabled={!jailbreakAvailable}
          style={{ flex: 1 }}
        >
          JAILBROKEN {!jailbreakAvailable && '🔒'}
        </button>
      </div>

      {/* Chat Messages - Seamless */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        background: '#fff'
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#999', fontSize: '14px' }}>
            Start a conversation below
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '15px',
              color: '#000',
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
              {msg.role === 'user' ? 'You' : getModeLabel()} • {msg.timestamp.toLocaleTimeString()}
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

      {/* Input Area - Seamless, no border, no button */}
      <div style={{
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
          placeholder={`Message ${getModeLabel()}...`}
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
  )
}
