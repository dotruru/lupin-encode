import { useState, useRef, useEffect } from 'react'
import './LupinTab.css'
import AnonymousLogo from './AnonymousLogo'
import './AnonymousLogo.css'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: string
}

export default function LupinTab() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on mount
    const saved = localStorage.getItem('lupin_chat_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      } catch {
        return []
      }
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // const [targetModel, setTargetModel] = useState('')
  // const [modelInput, setModelInput] = useState('')
  // const [modelStatus, setModelStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle')
  // const [disclosureModel, setDisclosureModel] = useState<string | null>(null)
  const [externalConversations, setExternalConversations] = useState<Array<{prompt: string, response: string, model: string, success: boolean, timestamp: Date}>>([])
  const [showExternalPanel, setShowExternalPanel] = useState(false)
  const [externalInput, setExternalInput] = useState('')
  const [currentExternalModel, setCurrentExternalModel] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const externalMessagesEndRef = useRef<HTMLDivElement>(null)

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('lupin_chat_history', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    externalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [externalConversations])

  useEffect(() => {
    // Initialize DB
    fetch('http://localhost:8000/api/agent/initialize-db', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        addSystemMessage(`Database ready with ${data.counts?.total || 0} prompts`, 'init')
      })
      .catch(() => addSystemMessage('Failed to initialize database', 'error'))
    // fetchTargetModelState() // Unused for now
  }, [])

  const addSystemMessage = (content: string, type: string = 'system') => {
    setMessages(prev => [...prev, {
      role: 'system',
      content,
      timestamp: new Date(),
      type
    }])
  }

  const addThoughtMessage = (content: string, subtype: string = 'thought') => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: subtype
    }])
  }

  // Unused - keeping for potential future use
  // const addAssistantDisclosure = (model: string) => { ... }
  // const handleModelSave = async () => { ... }
  // const canSaveModel = Boolean(modelInput.trim() && modelStatus !== 'saving')

  const formatToolArgs = (args: Record<string, any>) => {
    const safeArgs = args || {}
    const entries = Object.entries(safeArgs)
      .filter(([key]) => key !== 'prompt' || (typeof safeArgs.prompt === 'string' && safeArgs.prompt.length <= 80))
      .map(([key, value]) => {
        const normalized = typeof value === 'string'
          ? (value.length > 60 ? `${value.slice(0, 57)}…` : value)
          : JSON.stringify(value)
        return `${key}=${normalized}`
      })
    return entries.join(', ')
  }

  const summarizeToolResult = (tool: string, result: any) => {
    if (!result) return 'Finished running the tool.'

    switch (tool) {
      case 'query_db':
        return `Found ${Array.isArray(result) ? result.length : 0} matching prompts.`
      case 'list_models':
        return `Listed ${result?.total || result?.models?.length || 0} models (${result?.filtered_by || 'all providers'}).`
      case 'jailbreak_attempt':
        return result.success
          ? `Success – model replied with ${result.response?.length || 0} characters.`
          : `Blocked (${result.error || 'model refused'}).`
      case 'scrape_reddit':
        return result.success
          ? `Pulled ${result.count || 0} new prompts from Reddit.`
          : `Reddit scrape failed: ${result.error || 'unknown error'}.`
      case 'write_notepad':
        return `Saved ${result.length || 0} characters to the notepad.`
      case 'read_notepad':
        return result.length
          ? `Loaded notepad draft (${result.length} characters).`
          : 'Notepad is currently empty.'
      case 'clear_external_history':
        return `Cleared ${result.cleared_messages || 0} messages from external LLM history.`
      case 'chat_with_external':
        return result.success
          ? `External LLM replied (${result.history_length || 0} messages in history).`
          : `Failed to chat: ${result.error || 'unknown error'}.`
      default:
        return typeof result === 'string'
          ? result.slice(0, 140)
          : `Result: ${JSON.stringify(result).slice(0, 140)}`
    }
  }

  const sendMessage = async (initialMessage?: string) => {
    const messageToSend = initialMessage || input
    if (!messageToSend.trim() || isLoading) return

    // Only add user message if it's from the input field
    if (!initialMessage) {
      const userMessage: Message = {
        role: 'user',
        content: messageToSend,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setInput('')
    }

    setIsLoading(true)

    try {
      await continueConversation(messageToSend)
    } catch (error) {
      addSystemMessage(`Error: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const sendExternalMessage = () => {
    if (!externalInput.trim() || !currentExternalModel) {
      console.log('[EXTERNAL_CHAT] Cannot send - input or model missing', {externalInput, currentExternalModel})
      return
    }

    console.log('[EXTERNAL_CHAT] Sending message to external LLM:', {
      model: currentExternalModel,
      message: externalInput
    })

    const message = `use chat_with_external to send this message to ${currentExternalModel}: "${externalInput}"`
    setExternalInput('')

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    setIsLoading(true)
    continueConversation(message).catch(error => {
      addSystemMessage(`Error: ${error}`, 'error')
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const continueConversation = async (userMessage: string, maxIterations: number = 10) => {
    let currentMessage = userMessage
    let iterations = 0

    while (iterations < maxIterations) {
      iterations++

      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      const response = await fetch('http://localhost:8000/api/chat/lupin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          conversation_history: conversationHistory
        })
      })

      const data = await response.json()

      // Check if there was a tool call
      if (data.tool_call) {
        const argsText = formatToolArgs(data.tool_call.args)
        addThoughtMessage(
          `↻ ${data.tool_call.tool}${argsText ? ` with ${argsText}` : ''}`,
          'thought'
        )
        addThoughtMessage(
          `→ ${summarizeToolResult(data.tool_call.tool, data.tool_result)}`,
          'result'
        )

        // Capture jailbreak attempts for external conversation panel
        if (data.tool_call.tool === 'jailbreak_attempt' && data.tool_result) {
          console.log('[JAILBREAK_CAPTURE] Tool call:', data.tool_call)
          console.log('[JAILBREAK_CAPTURE] Tool result:', data.tool_result)

          const jailbreakData = data.tool_result
          const promptSent = data.tool_call.args?.prompt || jailbreakData.prompt || 'Unknown prompt'
          const modelResponse = jailbreakData.response || jailbreakData.error || 'No response'
          const targetModel = jailbreakData.model || data.tool_call.args?.target_model || data.tool_call.args?.model || 'unknown'

          const conversation = {
            prompt: promptSent,
            response: modelResponse,
            model: targetModel,
            success: jailbreakData.success || false,
            timestamp: new Date()
          }

          console.log('[JAILBREAK_CAPTURE] Adding conversation:', conversation)
          setExternalConversations(prev => [...prev, conversation])
          setCurrentExternalModel(targetModel)
        }

        // Capture chat_with_external conversations
        if (data.tool_call.tool === 'chat_with_external' && data.tool_result) {
          const chatData = data.tool_result
          const messageSent = data.tool_call.args?.message || 'Unknown message'
          const modelResponse = chatData.response || chatData.error || 'No response'
          const targetModel = chatData.model || data.tool_call.args?.target_model || 'unknown'

          setExternalConversations(prev => [...prev, {
            prompt: messageSent,
            response: modelResponse,
            model: targetModel,
            success: chatData.success || false,
            timestamp: new Date()
          }])
        }

        // Add Lupin's thought/explanation before tool call
        if (data.response && !data.response.includes('{"tool"')) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMessage])
        }

        // Continue conversation with tool result
        currentMessage = `Tool result: ${JSON.stringify(data.tool_result)}`
        continue
      } else {
        // No tool call, just add response and stop
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        break
      }
    }

    if (iterations >= maxIterations) {
      addSystemMessage('Max iterations reached', 'warning')
    }
  }


  return (
    <div className="lupin-tab expanded">
      <div className="lupin-chat-container">
        <div className="lupin-main-chat">
          <div className="lupin-messages">
            {messages.length === 0 && (
              <div className="lupin-empty">
                <AnonymousLogo size={48} animate />
                <p>Chat with Lupin - ask me to jailbreak models, scrape prompts, or anything else</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`lupin-message ${msg.role} ${msg.type || ''}`}>
                <div className="lupin-message-header">
                  {msg.role === 'assistant' && <AnonymousLogo size={16} className="message-avatar" />}
                  <span className="message-sender">
                    {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Lupin'}
                  </span>
                  <span className="message-time">• {msg.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="lupin-message-content">{msg.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className="lupin-loading">
                <div className="loading-dots">
                  <AnonymousLogo size={20} animate />
                  <span>Lupin is thinking</span>
                  <span className="dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="lupin-input-container">
            {messages.length > 0 && (
              <button
                className="clear-chat-button"
                onClick={() => {
                  setMessages([])
                  setExternalConversations([])
                  localStorage.removeItem('lupin_chat_history')
                }}
                title="Clear chat history"
              >
                Clear History
              </button>
            )}
            <input
              type="text"
              className="lupin-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message Lupin..."
              disabled={isLoading}
            />
          </div>
        </div>

        {externalConversations.length > 0 && (
          <div
            className={`lupin-external-panel ${showExternalPanel ? 'expanded' : 'collapsed'}`}
            onClick={() => setShowExternalPanel(!showExternalPanel)}
          >
            {!showExternalPanel ? (
              <div className="external-panel-hint">
                <AnonymousLogo size={20} animate />
                <span>External LLM Attempts ({externalConversations.length})</span>
                <span className="expand-hint">Click to expand</span>
              </div>
            ) : (
              <div className="external-panel-content" onClick={(e) => e.stopPropagation()}>
                <div className="external-panel-header" onClick={() => setShowExternalPanel(false)}>
                  <div>
                    <AnonymousLogo size={20} animate />
                    <span>Lupin → External LLMs</span>
                  </div>
                  <span className="collapse-hint">Click to collapse</span>
                </div>
                <div className="external-messages">
                  {externalConversations.map((conv, idx) => (
                    <div key={idx} className="external-conversation">
                      <div className="lupin-message assistant">
                        <div className="lupin-message-header">
                          <AnonymousLogo size={16} className="message-avatar" />
                          <span className="message-sender">Lupin</span>
                          <span className="message-time">• {conv.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="lupin-message-content">{conv.prompt}</div>
                      </div>
                      <div className={`lupin-message ${conv.success ? 'success' : 'blocked'}`}>
                        <div className="lupin-message-header">
                          <span className="message-sender">{conv.model}</span>
                          <span className={`message-status ${conv.success ? 'success' : 'blocked'}`}>
                            {conv.success ? '✓ Success' : '✗ Blocked'}
                          </span>
                        </div>
                        <div className="lupin-message-content">{conv.response}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={externalMessagesEndRef} />
                </div>
                {currentExternalModel && (
                  <div className="external-input-container">
                    <input
                      type="text"
                      className="external-input"
                      value={externalInput}
                      onChange={(e) => setExternalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendExternalMessage()
                        }
                      }}
                      placeholder={`Message ${currentExternalModel}...`}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
