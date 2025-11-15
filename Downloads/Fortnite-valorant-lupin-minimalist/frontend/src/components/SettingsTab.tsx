import { useState, useEffect } from 'react'
import './SettingsTab.css'

interface APIKeys {
  openrouter: string
  huggingface: string
  perplexity: string
}

interface SettingsTabProps {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
}

export default function SettingsTab({ theme, onThemeChange }: SettingsTabProps) {
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    openrouter: '',
    huggingface: '',
    perplexity: ''
  })
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState({
    openrouter: false,
    huggingface: false,
    perplexity: false
  })

  useEffect(() => {
    // Load saved API keys from localStorage
    const savedKeys = localStorage.getItem('lupin_api_keys')
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys))
      } catch (e) {
        console.error('Failed to load saved keys:', e)
      }
    }
  }, [])

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('lupin_api_keys', JSON.stringify(apiKeys))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all API keys?')) {
      const emptyKeys = {
        openrouter: '',
        huggingface: '',
        perplexity: ''
      }
      setApiKeys(emptyKeys)
      localStorage.removeItem('lupin_api_keys')
    }
  }

  const toggleShowKey = (key: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>API KEY SETTINGS</h2>
        <p className="settings-subtitle">Configure your API keys for external services</p>
      </div>

      <div className="settings-content">
        <div className="settings-section theme-section">
          <div className="theme-info">
            <h3>Interface Theme</h3>
            <p>Switch between light and dark mode. Preference is stored locally.</p>
          </div>
          <div className="theme-toggle">
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              LIGHT
            </button>
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              DARK
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="key-info">
            <h3>OpenRouter API Key</h3>
            <p>Used for agent brain (GLM model) and LLM jailbreak testing</p>
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="get-key-link">
              Get your key →
            </a>
          </div>
          <div className="key-input-group">
            <input
              type={showKeys.openrouter ? "text" : "password"}
              value={apiKeys.openrouter}
              onChange={(e) => setApiKeys({ ...apiKeys, openrouter: e.target.value })}
              placeholder="sk-or-v1-..."
              className="key-input"
            />
            <button 
              className="toggle-visibility"
              onClick={() => toggleShowKey('openrouter')}
              title={showKeys.openrouter ? "Hide key" : "Show key"}
            >
              {showKeys.openrouter ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {apiKeys.openrouter && !showKeys.openrouter && (
            <div className="key-preview">{maskKey(apiKeys.openrouter)}</div>
          )}
        </div>

        <div className="settings-section">
          <div className="key-info">
            <h3>Hugging Face API Key</h3>
            <p>Used for LLM-based exploit discovery and searching</p>
            <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="get-key-link">
              Get your key →
            </a>
          </div>
          <div className="key-input-group">
            <input
              type={showKeys.huggingface ? "text" : "password"}
              value={apiKeys.huggingface}
              onChange={(e) => setApiKeys({ ...apiKeys, huggingface: e.target.value })}
              placeholder="hf_..."
              className="key-input"
            />
            <button 
              className="toggle-visibility"
              onClick={() => toggleShowKey('huggingface')}
              title={showKeys.huggingface ? "Hide key" : "Show key"}
            >
              {showKeys.huggingface ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {apiKeys.huggingface && !showKeys.huggingface && (
            <div className="key-preview">{maskKey(apiKeys.huggingface)}</div>
          )}
        </div>

        <div className="settings-section">
          <div className="key-info">
            <h3>Perplexity API Key</h3>
            <p>Used for web-based exploit discovery via Perplexity Sonar</p>
            <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="get-key-link">
              Get your key →
            </a>
          </div>
          <div className="key-input-group">
            <input
              type={showKeys.perplexity ? "text" : "password"}
              value={apiKeys.perplexity}
              onChange={(e) => setApiKeys({ ...apiKeys, perplexity: e.target.value })}
              placeholder="pplx-..."
              className="key-input"
            />
            <button 
              className="toggle-visibility"
              onClick={() => toggleShowKey('perplexity')}
              title={showKeys.perplexity ? "Hide key" : "Show key"}
            >
              {showKeys.perplexity ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {apiKeys.perplexity && !showKeys.perplexity && (
            <div className="key-preview">{maskKey(apiKeys.perplexity)}</div>
          )}
        </div>

        <div className="settings-actions">
          <button 
            className="save-button"
            onClick={handleSave}
          >
            {saved ? '✓ SAVED' : 'SAVE KEYS'}
          </button>
          <button 
            className="clear-button"
            onClick={handleClear}
          >
            CLEAR ALL
          </button>
        </div>

        {saved && (
          <div className="save-notice">
            API keys saved to browser storage
          </div>
        )}

        <div className="settings-note">
          <h4>Note:</h4>
          <ul>
            <li>Keys are stored locally in your browser (localStorage)</li>
            <li>Keys are never sent to any server except the APIs they're intended for</li>
            <li>You can clear your keys anytime from this page</li>
            <li>Some features may auto-fill these keys if detected</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Export helper function to get API keys from localStorage
export const getStoredAPIKeys = (): APIKeys => {
  const savedKeys = localStorage.getItem('lupin_api_keys')
  if (savedKeys) {
    try {
      return JSON.parse(savedKeys)
    } catch (e) {
      console.error('Failed to load saved keys:', e)
    }
  }
  return {
    openrouter: '',
    huggingface: '',
    perplexity: ''
  }
}
