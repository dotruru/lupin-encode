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
  const [activeTab, setActiveTab] = useState<'lupin' | 'exploits' | 'safety' | 'vault' | 'settings'>('lupin')
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
            <p className="subtitle">Jailbreak Agent and PIE Tracker</p>
          </div>
        </div>
        <div className="header-credit">
          Made with love by the CrakHaus
        </div>
      </header>

      <div className="tab-bar">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'lupin' ? 'active' : ''}`}
            onClick={() => setActiveTab('lupin')}
          >
            LUPIN
          </button>
          <button
            className={`tab-button ${activeTab === 'exploits' ? 'active' : ''}`}
            onClick={() => setActiveTab('exploits')}
          >
            EXPLOIT TRACKER
          </button>
          <button
            className={`tab-button ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            TEST YOUR LLM
          </button>
          <button
            className={`tab-button ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            ARC VAULT
          </button>
        </div>
        <button
          className={`settings-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          SETTINGS
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
