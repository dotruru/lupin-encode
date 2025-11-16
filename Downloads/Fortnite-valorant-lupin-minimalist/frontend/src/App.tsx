import { useState, useEffect } from 'react'
import './App.css'
import LupinTab from './components/LupinTab'
import ExploitsTab from './components/ExploitsTab'
import ModelCheckTab from './components/ModelCheckTab'
import SafetyVaultTab from './components/SafetyVaultTab'
import SettingsTab from './components/SettingsTab'
import PoliciesModal from './components/PoliciesModal'
import AnonymousLogo from './components/AnonymousLogo'
import './components/AnonymousLogo.css'

type Theme = 'light' | 'dark'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('lupin_theme')
  return stored === 'dark' ? 'dark' : 'light'
}

function App() {
  const [activeTab, setActiveTab] = useState<'lupin' | 'exploits' | 'safety' | 'vault' | 'settings'>('vault')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [showPoliciesModal, setShowPoliciesModal] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('lupin_theme', theme)
  }, [theme])

  return (
    <div className="app">
      <div className="ethical-banner">
        <button
          onClick={() => setShowPoliciesModal(true)}
          className="banner-link"
        >
          ETHICAL USE • TERMS • DISCLOSURE POLICY
        </button>
      </div>
      <header className="header">
        <div className="header-content">
          <AnonymousLogo size={72} animate />
          <div className="header-text">
            <h1>LUPIN</h1>
            <p className="subtitle">AI Safety Testing Platform with On-Chain Accountability on Arc</p>
          </div>
        </div>
        <div className="header-credit">
          Made with love by the CrakHaus
        </div>
      </header>

      <div className="tab-bar">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
            title="Create safety vaults, run tests, manage USDC escrow on Arc"
          >
            <span className="tab-icon">🔒</span>
            <span className="tab-text">
              <span className="tab-label">SAFETY VAULT</span>
              <span className="tab-hint">Arc Projects</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'exploits' ? 'active' : ''}`}
            onClick={() => setActiveTab('exploits')}
            title="Browse LLM jailbreaks and agent attack scenarios"
          >
            <span className="tab-icon">🔍</span>
            <span className="tab-text">
              <span className="tab-label">EXPLOITS</span>
              <span className="tab-hint">CVE Database</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
            title="Quick one-off LLM testing without Arc vault"
          >
            <span className="tab-icon">⚡</span>
            <span className="tab-text">
              <span className="tab-label">QUICK TEST</span>
              <span className="tab-hint">Ad-hoc Testing</span>
            </span>
          </button>
          <button
            className={`tab-button ${activeTab === 'lupin' ? 'active' : ''}`}
            onClick={() => setActiveTab('lupin')}
            title="Interactive AI agent for research and analysis"
          >
            <span className="tab-icon">💬</span>
            <span className="tab-text">
              <span className="tab-label">AGENT CHAT</span>
              <span className="tab-hint">Research</span>
            </span>
          </button>
        </div>
        <button
          className={`settings-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Configure API keys and preferences"
        >
          ⚙️ SETTINGS
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'lupin' && <LupinTab />}
        {activeTab === 'exploits' && <ExploitsTab />}
        {activeTab === 'safety' && <ModelCheckTab />}
        {activeTab === 'vault' && <SafetyVaultTab />}
        {activeTab === 'settings' && <SettingsTab theme={theme} onThemeChange={setTheme} />}
      </div>

      {showPoliciesModal && (
        <PoliciesModal onClose={() => setShowPoliciesModal(false)} />
      )}
    </div>
  )
}

export default App
