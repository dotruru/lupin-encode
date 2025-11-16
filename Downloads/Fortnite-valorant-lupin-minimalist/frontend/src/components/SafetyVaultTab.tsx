import { useState, useEffect } from 'react'
import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers'
import './SafetyVaultTab.css'
import { getStoredAPIKeys } from './SettingsTab'

interface Project {
  id: string
  onchain_project_id: number
  name: string | null
  owner_address: string
  token_symbol: string
  target_model: string
  min_score: number
  payout_rate_bps: number
  penalty_rate_bps: number
  escrow_balance?: number
  reward_balance?: number
  bounty_pool_balance?: number
  last_score?: number
  avg_score?: number
  test_count?: number
  last_test_time?: number
  active?: boolean
  created_at: string
}

const USDC_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const VAULT_CREATE_PROJECT_ABI = [
  {
    inputs: [
      { internalType: 'uint8', name: 'minScore', type: 'uint8' },
      { internalType: 'uint16', name: 'payoutRateBps', type: 'uint16' },
      { internalType: 'uint16', name: 'penaltyRateBps', type: 'uint16' },
      { internalType: 'uint256', name: 'initialDeposit', type: 'uint256' }
    ],
    name: 'createProject',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const VAULT_WITHDRAW_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'projectId',
        type: 'uint256'
      }
    ],
    name: 'withdrawRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const toNumberChainId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) {
      return null
    }
    const parsed = normalized.startsWith('0x')
      ? Number.parseInt(normalized, 16)
      : Number.parseInt(normalized, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const REQUIRED_CHAIN_ID = toNumberChainId(import.meta.env.VITE_ARC_CHAIN_ID)
const REQUIRED_CHAIN_LABEL = REQUIRED_CHAIN_ID ? `Chain #${REQUIRED_CHAIN_ID}` : 'Arc network'
const REQUIRED_CHAIN_HEX = REQUIRED_CHAIN_ID ? `0x${REQUIRED_CHAIN_ID.toString(16)}` : null
const VAULT_ADDRESS = (import.meta.env.VITE_ARC_VAULT_ADDRESS || '').trim()
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

const getEthereumProvider = () => (typeof window === 'undefined' ? undefined : window.ethereum)

export default function SafetyVaultTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletChainId, setWalletChainId] = useState<number | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [isWalletConnecting, setIsWalletConnecting] = useState(false)
  const [withdrawInFlight, setWithdrawInFlight] = useState(false)
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null)
  const [lastWithdrawTx, setLastWithdrawTx] = useState<string | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [createStep, setCreateStep] = useState<string>('')
  const [testMode, setTestMode] = useState<'llm' | 'agent'>('llm')
  const [agentEndpoint, setAgentEndpoint] = useState<string>('http://localhost:8000/api/mock-agent')
  const [agentEndpointType, setAgentEndpointType] = useState<'mock' | 'custom'>('mock')
  const [showTestProgress, setShowTestProgress] = useState(false)
  const [testProgress, setTestProgress] = useState<{
    total: number
    current: number
    currentTest: string
    results: Array<{ safe: boolean; title: string; tools?: string[]; violations?: string[] }>
    finalScore?: number
    finalTxHash?: string
  }>({ total: 0, current: 0, currentTest: '', results: [] })

  // Create project form
  const [formData, setFormData] = useState({
    name: '',
    target_model: 'z-ai/glm-4.5-air:free',
    min_score: 90,
    payout_rate_bps: 500,
    penalty_rate_bps: 500,
    initial_deposit: '100'
  })

  const providerAvailable = Boolean(getEthereumProvider())
  const walletConnected = Boolean(walletAddress)
  const walletNeedsNetworkSwitch =
    walletConnected &&
    REQUIRED_CHAIN_ID !== null &&
    walletChainId !== null &&
    walletChainId !== REQUIRED_CHAIN_ID

  const walletHelperMessage = (() => {
    if (!providerAvailable) {
      return 'No browser wallet detected. Install MetaMask or an Arc-compatible wallet.'
    }
    if (!walletConnected) {
      return 'Connect your wallet to create projects or withdraw rewards.'
    }
    if (walletNeedsNetworkSwitch) {
      return `Switch to ${REQUIRED_CHAIN_LABEL} to manage Arc projects.`
    }
    return 'Wallet ready for Arc Safety Vault interactions.'
  })()

  const connectWallet = async (): Promise<boolean> => {
    const provider = getEthereumProvider()
    if (!provider) {
      setWalletError('No wallet provider detected. Install MetaMask or an Arc-compatible wallet.')
      return false
    }
    setIsWalletConnecting(true)
    try {
      setWalletError(null)
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts available')
      }
      setWalletAddress(accounts[0])
      const chainId = await provider.request({ method: 'eth_chainId' })
      setWalletChainId(toNumberChainId(chainId))
      return true
    } catch (error) {
      console.error('Wallet connection failed:', error)
      const message = error instanceof Error ? error.message : 'Failed to connect wallet'
      setWalletError(message)
      return false
    } finally {
      setIsWalletConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setWalletChainId(null)
    setWalletError(null)
  }

  const switchToRequiredChain = async (): Promise<boolean> => {
    const provider = getEthereumProvider()
    if (!provider || !REQUIRED_CHAIN_HEX) {
      setWalletError('Arc chain configuration missing. Set VITE_ARC_CHAIN_ID in the frontend .env file.')
      return false
    }
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN_HEX }]
      })
      setWalletError(null)
      if (REQUIRED_CHAIN_ID !== null) {
        setWalletChainId(REQUIRED_CHAIN_ID)
      }
      return true
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? Number((error as { code?: number | string }).code)
          : undefined
      if (code === 4902) {
        setWalletError('Arc chain not found in wallet. Add it manually, then retry.')
      } else {
        setWalletError(error instanceof Error ? error.message : 'Unable to switch network.')
      }
      console.error('Failed to switch wallet network:', error)
      return false
    }
  }

  const ensureWalletReady = async () => {
    const provider = getEthereumProvider()
    if (!provider) {
      setWalletError('No wallet provider detected. Install MetaMask or Arc wallet.')
      return false
    }
    if (!walletConnected) {
      return connectWallet()
    }
    if (walletNeedsNetworkSwitch) {
      return switchToRequiredChain()
    }
    return true
  }

  const handleCreateProjectClick = async () => {
    const ready = await ensureWalletReady()
    if (ready) {
      setShowCreateForm(true)
    }
  }

  const handleWithdrawClick = async (project: Project) => {
    const ready = await ensureWalletReady()
    if (!ready) {
      return
    }
    if (!VAULT_ADDRESS) {
      alert('Vault contract address missing. Set VITE_ARC_VAULT_ADDRESS in the frontend .env file.')
      return
    }
    const provider = getEthereumProvider()
    if (!provider) {
      setWalletError('Wallet provider became unavailable.')
      return
    }

    try {
      setWithdrawInFlight(true)
      setPendingTxHash(null)
      setLastWithdrawTx(null)

      const browserProvider = new BrowserProvider(provider as Eip1193Provider)
      const signer = await browserProvider.getSigner()
      const vaultContract = new Contract(VAULT_ADDRESS, VAULT_WITHDRAW_ABI, signer)
      const tx = await vaultContract.withdrawRewards(project.onchain_project_id)

      setPendingTxHash(tx.hash)
      const receipt = await tx.wait()
      const confirmedHash =
        (receipt as { hash?: string; transactionHash?: string }).hash ??
        (receipt as { hash?: string; transactionHash?: string }).transactionHash ??
        tx.hash
      setLastWithdrawTx(confirmedHash)
      alert(
        `Rewards withdrawn!\n` +
        `Project ID: ${project.onchain_project_id}\n` +
        `Transaction: ${confirmedHash}`
      )
      await fetchProjectDetails(project.id)
      await fetchProjects()
    } catch (error) {
      console.error('Withdraw failed:', error)
      const message = error instanceof Error ? error.message : 'Withdraw failed. Check wallet for details.'
      alert(`Withdraw failed: ${message}`)
    } finally {
      setWithdrawInFlight(false)
      setPendingTxHash(null)
    }
  }

  useEffect(() => {
    fetchProjects()
    const storedKeys = getStoredAPIKeys()
    if (storedKeys.openrouter) {
      setApiKey(storedKeys.openrouter)
    }
  }, [])

  useEffect(() => {
    const provider = getEthereumProvider()
    if (!provider) return

    let mounted = true

    const bootstrap = async () => {
      try {
        const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
        if (mounted && accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
        const chainId = await provider.request({ method: 'eth_chainId' })
        if (mounted) {
          setWalletChainId(toNumberChainId(chainId))
        }
      } catch (error) {
        console.warn('Unable to initialize wallet state:', error)
      }
    }

    const handleAccountsChanged = (accountsRaw: unknown) => {
      if (Array.isArray(accountsRaw) && accountsRaw.length > 0 && typeof accountsRaw[0] === 'string') {
        setWalletAddress(accountsRaw[0])
        return
      }
      setWalletAddress(null)
    }

    const handleChainChanged = (chainIdRaw: unknown) => {
      const nextValue = Array.isArray(chainIdRaw) ? chainIdRaw[0] : chainIdRaw
      setWalletChainId(toNumberChainId(nextValue))
    }

    void bootstrap()
    provider.on?.('accountsChanged', handleAccountsChanged)
    provider.on?.('chainChanged', handleChainChanged)

    return () => {
      mounted = false
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
      provider.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/projects/')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      alert('Failed to fetch projects: ' + error)
    }
    setLoading(false)
  }

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/projects/${projectId}`)
      const data = await response.json()
      setSelectedProject(data)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
      alert('Failed to fetch project details: ' + error)
    }
  }

  const runSafetyTestRealtime = (projectId: string) => {
    if (!apiKey.trim()) {
      alert('Please set your OpenRouter API key in Settings first')
      return
    }

    if (testMode === 'agent' && !agentEndpoint.trim()) {
      alert('Please enter an agent API endpoint for agent testing')
      return
    }

    setTestRunning(true)
    setShowTestProgress(true)
    setTestProgress({ total: 0, current: 0, currentTest: '', results: [] })

    const params = new URLSearchParams({
      api_key: apiKey,
      max_exploits: '10',
      test_mode: testMode
    })

    if (testMode === 'agent') {
      params.append('agent_endpoint', agentEndpoint)
      params.append('agent_type', 'general')
    }

    const eventSource = new EventSource(
      `http://localhost:8000/api/projects/${projectId}/run-test-stream?${params}`
    )

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'start':
          console.log('Test started:', data.mode)
          break

        case 'total':
          setTestProgress(prev => ({ ...prev, total: data.count }))
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
            results: [...prev.results, {
              safe: data.safe,
              title: data.title,
              tools: data.tools,
              violations: data.violations
            }]
          }))
          break

        case 'recording':
          setTestProgress(prev => ({ ...prev, currentTest: 'Recording on-chain...' }))
          break

        case 'complete':
          setTestProgress(prev => ({
            ...prev,
            finalScore: data.score,
            finalTxHash: data.tx_hash,
            currentTest: 'Complete!'
          }))
          eventSource.close()
          setTestRunning(false)
          void fetchProjects()
          void fetchProjectDetails(projectId)
          break

        case 'error':
          alert(`Test error: ${data.message}`)
          eventSource.close()
          setTestRunning(false)
          setShowTestProgress(false)
          break
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setTestRunning(false)
      alert('Test stream failed. Check backend logs.')
      setShowTestProgress(false)
    }
  }

  const runSafetyTest = async (projectId: string) => {
    if (!apiKey.trim()) {
      alert('Please set your OpenRouter API key in Settings first')
      return
    }

    if (testMode === 'agent' && !agentEndpoint.trim()) {
      alert('Please enter an agent API endpoint for agent testing')
      return
    }

    setTestRunning(true)
    try {
      const requestBody: any = {
        api_key: apiKey,
        max_exploits: 10,  // Optimized for cheap hackathon demo
        test_mode: testMode
      }

      if (testMode === 'agent') {
        requestBody.agent_endpoint = agentEndpoint
        requestBody.agent_type = 'general'
      }

      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/run-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Test failed')
      }

      const data = await response.json()
      
      const testTypeLabel = testMode === 'agent' ? 'Agent Safety Test' : 'LLM Jailbreak Test'
      const metricsText = testMode === 'agent'
        ? `Scenarios run: ${data.summary.total_scenarios}\n` +
          `Safe behaviors: ${data.summary.safe_behaviors}\n` +
          `Unsafe behaviors: ${data.summary.unsafe_behaviors}\n` +
          `Critical failures: ${data.summary.critical_failures}`
        : `Tests run: ${data.summary.total_tests}\n` +
          `Blocked: ${data.summary.blocked_exploits}\n` +
          `Broken: ${data.summary.successful_exploits}`
      
      alert(
        `${testTypeLabel} complete!\n\n` +
        `Score: ${data.score}/100\n` +
        `Critical failures: ${data.critical_count}\n` +
        `Transaction: ${data.tx_hash}\n\n` +
        metricsText
      )

      // Refresh project data
      await fetchProjectDetails(projectId)
      await fetchProjects()
    } catch (error) {
      console.error('Safety test failed:', error)
      alert('Safety test failed: ' + error)
    }
    setTestRunning(false)
  }

  const formatBalance = (balance?: number) => {
    if (balance === undefined || balance === null) return 'Loading...'
    // USDC has 6 decimals
    return (balance / 1_000_000).toFixed(2) + ' USDC'
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatTxHash = (hash: string) => {
    if (!hash) return ''
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const handleCreateProject = async () => {
    if (!VAULT_ADDRESS) {
      alert('Vault address not configured. Set VITE_ARC_VAULT_ADDRESS in frontend/.env')
      return
    }

    const ready = await ensureWalletReady()
    if (!ready || !walletAddress) {
      alert('Wallet not ready. Connect to Arc Testnet first.')
      return
    }

    const provider = getEthereumProvider()
    if (!provider) {
      alert('Wallet provider unavailable')
      return
    }

    try {
      setCreatingProject(true)
      setWalletError(null)

      const browserProvider = new BrowserProvider(provider as Eip1193Provider)
      const signer = await browserProvider.getSigner()

      // Convert deposit to wei (6 decimals for USDC)
      const depositAmount = BigInt(Math.floor(parseFloat(formData.initial_deposit) * 1_000_000))

      // Step 1: Approve USDC
      setCreateStep('Approving USDC...')
      const usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, signer)
      const approveTx = await usdcContract.approve(VAULT_ADDRESS, depositAmount)
      await approveTx.wait()

      // Step 2: Call createProject
      setCreateStep('Creating project on-chain...')
      const vaultContract = new Contract(VAULT_ADDRESS, VAULT_CREATE_PROJECT_ABI, signer)
      const createTx = await vaultContract.createProject(
        formData.min_score,
        formData.payout_rate_bps,
        formData.penalty_rate_bps,
        depositAmount
      )
      const receipt = await createTx.wait()

      // Parse ProjectCreated event to get projectId
      let onchainProjectId: number | null = null
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        // ProjectCreated event is typically the first log
        // Event signature: ProjectCreated(uint256 indexed projectId, ...)
        try {
          const log = receipt.logs[0]
          if (log.topics && log.topics.length > 1) {
            onchainProjectId = Number(log.topics[1])
          }
        } catch (e) {
          console.warn('Could not parse projectId from event, will check ArcScan:', e)
        }
      }

      if (!onchainProjectId) {
        alert(`Project created on-chain!\nTransaction: ${createTx.hash}\n\nCheck ArcScan for projectId, then manually register via backend.`)
        setShowCreateForm(false)
        setCreatingProject(false)
        setCreateStep('')
        return
      }

      // Step 3: Register with backend
      setCreateStep('Registering with backend...')
      const registerPayload = {
        onchain_project_id: onchainProjectId,
        owner_address: walletAddress,
        name: formData.name || `Project #${onchainProjectId}`,
        target_model: formData.target_model
      }
      console.log('Registering project with backend:', registerPayload)
      
      const registerResponse = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
      })

      if (!registerResponse.ok) {
        const error = await registerResponse.json()
        const errorMsg = error.detail || JSON.stringify(error)
        throw new Error(`Backend registration failed: ${errorMsg}`)
      }

      // Success!
      alert(
        `✅ Project created successfully!\n\n` +
        `On-chain ID: ${onchainProjectId}\n` +
        `Transaction: ${createTx.hash}\n` +
        `Escrow: ${formData.initial_deposit} USDC\n\n` +
        `View on ArcScan:\nhttps://testnet.arcscan.app/tx/${createTx.hash}`
      )

      setShowCreateForm(false)
      setFormData({
        name: '',
        target_model: 'z-ai/glm-4.5-air:free',
        min_score: 90,
        payout_rate_bps: 500,
        penalty_rate_bps: 500,
        initial_deposit: '100'
      })
      await fetchProjects()
    } catch (error) {
      console.error('Project creation failed:', error)
      const message = error instanceof Error ? error.message : 'Project creation failed'
      alert(`❌ Error: ${message}`)
      setWalletError(message)
    } finally {
      setCreatingProject(false)
      setCreateStep('')
    }
  }

  return (
    <div className="safety-vault-tab">
      <div className="vault-header">
        <div>
          <h2>ARC SAFETY VAULT</h2>
          <p className="vault-subtitle">
            On-chain LLM safety testing with automated escrow & rewards
          </p>
        </div>
        <div className="vault-actions">
          <div className={`wallet-panel ${walletConnected ? 'connected' : 'disconnected'}`}>
            <div className="wallet-row">
              <span className="wallet-label">Wallet</span>
              <span className="wallet-address">
                <span className={`wallet-status-dot ${walletConnected ? 'online' : 'offline'}`} />
                {walletConnected && walletAddress
                  ? formatAddress(walletAddress)
                  : 'Not connected'}
              </span>
            </div>
            <div className="wallet-row">
              <span className="wallet-label">Network</span>
              <span className={`wallet-network ${walletNeedsNetworkSwitch ? 'warn' : ''}`}>
                {walletChainId ? `Chain #${walletChainId}` : 'Unknown'}
                {walletNeedsNetworkSwitch && REQUIRED_CHAIN_ID !== null && (
                  <span className="wallet-network-expected"> → need #{REQUIRED_CHAIN_ID}</span>
                )}
              </span>
            </div>
            {walletError && <p className="wallet-error">{walletError}</p>}
            <p className="wallet-hint">{walletHelperMessage}</p>
            <div className="wallet-buttons">
              {!providerAvailable && (
                <a
                  className="btn-wallet"
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                >
                  INSTALL METAMASK
                </a>
              )}
              {providerAvailable && !walletConnected && (
                <button
                  className="btn-wallet"
                  onClick={() => void connectWallet()}
                  disabled={isWalletConnecting}
                >
                  {isWalletConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
                </button>
              )}
              {walletConnected && (
                <>
                  <button className="btn-wallet-secondary" onClick={disconnectWallet}>
                    Disconnect
                  </button>
                  {walletNeedsNetworkSwitch && (
                    <button className="btn-wallet" onClick={() => void switchToRequiredChain()}>
                      SWITCH NETWORK
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="vault-buttons">
            <button
              className="btn-create"
              onClick={() => void handleCreateProjectClick()}
            >
              + CREATE PROJECT
            </button>
            <button
              className="btn-refresh"
              onClick={fetchProjects}
              disabled={loading}
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
          </div>
        </div>
      </div>

      {projects.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Welcome to Arc Safety Vault</h3>
          <p className="empty-state-tagline">
            Turn AI safety promises into programmable USDC commitments on Arc
          </p>
          
          <div className="empty-state-features">
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <div>
                <h4>Lock USDC as Safety Collateral</h4>
                <p>Create financial accountability for AI systems</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <div>
                <h4>Test LLMs & Autonomous Agents</h4>
                <p>Detect jailbreaks, tool misuse, and goal hijacking</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div>
                <h4>Automatic Rewards & Penalties</h4>
                <p>Smart contract moves USDC based on safety scores</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <div>
                <h4>100% Transparent on Arc</h4>
                <p>All tests and fund movements verified on-chain</p>
              </div>
            </div>
          </div>
          
          <button className="btn-create-large" onClick={() => void handleCreateProjectClick()}>
            Create Your First Safety Vault
          </button>
          
          <p className="empty-state-hint">
            <a href="https://github.com/dotruru/lupin-encode/blob/main/DEMO_GUIDE.md" target="_blank" rel="noopener noreferrer">
              View Demo Guide
            </a>
            {' • '}
            <a href="https://testnet.arcscan.app/address/0xC58975099823A60F101B62940d88e6c8De9A80b1" target="_blank" rel="noopener noreferrer">
              View Contract on ArcScan
            </a>
          </p>
        </div>
      )}

      {projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => {
            const isPassing = project.last_score !== undefined && project.last_score >= project.min_score
            const hasTested = project.test_count !== undefined && project.test_count > 0
            const statusClass = !hasTested ? 'untested' : isPassing ? 'passing' : 'failing'
            
            return (
            <div key={project.id} className={`project-card ${statusClass}`}>
              <div className="project-card-header">
                <div>
                  <h3>{project.name || `Project #${project.onchain_project_id}`}</h3>
                  <p className="project-model">{project.target_model}</p>
                </div>
                <div className="header-badges">
                  {!hasTested && (
                    <span className="test-status-badge untested">⏳ NOT TESTED</span>
                  )}
                  {hasTested && isPassing && (
                    <span className="test-status-badge passing">✅ PASSING</span>
                  )}
                  {hasTested && !isPassing && (
                    <span className="test-status-badge failing">❌ FAILING</span>
                  )}
                  <span className={`status-badge ${project.active ? 'active' : 'paused'}`}>
                    {project.active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
              </div>

              <div className="project-metrics">
                <div className="metric">
                  <span className="metric-label">Chain ID</span>
                  <span className="metric-value">#{project.onchain_project_id}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Owner</span>
                  <span className="metric-value">{formatAddress(project.owner_address)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Last Score</span>
                  <span className="metric-value score">
                    {project.last_score !== undefined ? `${project.last_score}/100` : '--'}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Avg Score</span>
                  <span className="metric-value">
                    {project.avg_score !== undefined ? `${project.avg_score}/100` : '--'}
                  </span>
                </div>
              </div>

              <div className="project-balances">
                <div className="balance-item">
                  <span className="balance-label">Escrow</span>
                  <span className="balance-value">{formatBalance(project.escrow_balance)}</span>
                </div>
                <div className="balance-item">
                  <span className="balance-label">Rewards</span>
                  <span className="balance-value rewards">{formatBalance(project.reward_balance)}</span>
                </div>
                <div className="balance-item">
                  <span className="balance-label">Bounty Pool</span>
                  <span className="balance-value bounty">{formatBalance(project.bounty_pool_balance)}</span>
                </div>
              </div>

              <div className="project-actions">
                <button
                  className="btn-view"
                  onClick={() => fetchProjectDetails(project.id)}
                >
                  VIEW DETAILS
                </button>
                <button
                  className="btn-test"
                  onClick={() => runSafetyTestRealtime(project.id)}
                  disabled={testRunning || !project.active}
                >
                  {testRunning ? 'TESTING...' : 'RUN TEST'}
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-content project-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProject.name || `Project #${selectedProject.onchain_project_id}`}</h2>
              <button className="close-btn" onClick={() => setSelectedProject(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Project Info</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">On-Chain ID</span>
                    <span className="detail-value">#{selectedProject.onchain_project_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Owner</span>
                    <span className="detail-value">{selectedProject.owner_address}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Target Model</span>
                    <span className="detail-value">{selectedProject.target_model}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value ${selectedProject.active ? 'active' : 'paused'}`}>
                      {selectedProject.active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Configuration</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Min Score Threshold</span>
                    <span className="detail-value">{selectedProject.min_score}/100</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payout Rate</span>
                    <span className="detail-value">{(selectedProject.payout_rate_bps / 100).toFixed(2)}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Penalty Rate</span>
                    <span className="detail-value">{(selectedProject.penalty_rate_bps / 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>On-Chain Balances</h3>
                <div className="balances-large">
                  <div className="balance-card">
                    <span className="balance-label">Escrow</span>
                    <span className="balance-amount">{formatBalance(selectedProject.escrow_balance)}</span>
                    <span className="balance-hint">Locked collateral</span>
                  </div>
                  <div className="balance-card rewards">
                    <span className="balance-label">Rewards</span>
                    <span className="balance-amount">{formatBalance(selectedProject.reward_balance)}</span>
                    <span className="balance-hint">Ready to withdraw</span>
                  </div>
                  <div className="balance-card bounty">
                    <span className="balance-label">Bounty Pool</span>
                    <span className="balance-amount">{formatBalance(selectedProject.bounty_pool_balance)}</span>
                    <span className="balance-hint">For researchers</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Safety Metrics</h3>
                
                {/* Visual Score Indicator */}
                {selectedProject.last_score !== undefined && (
                  <div className="score-gauge-container">
                    <div className="score-gauge">
                      <div className="gauge-track">
                        <div 
                          className={`gauge-fill ${selectedProject.last_score >= selectedProject.min_score ? 'passing' : 'failing'}`}
                          style={{ width: `${selectedProject.last_score}%` }}
                        />
                        <div 
                          className="gauge-threshold"
                          style={{ left: `${selectedProject.min_score}%` }}
                          title={`Threshold: ${selectedProject.min_score}%`}
                        />
                      </div>
                      <div className="gauge-labels">
                        <span>0</span>
                        <span className="threshold-label">{selectedProject.min_score}% required</span>
                        <span>100</span>
                      </div>
                    </div>
                    <div className="score-status">
                      <div className="score-value">
                        Last Score: <strong>{selectedProject.last_score}/100</strong>
                        {selectedProject.last_score >= selectedProject.min_score ? (
                          <span className="score-indicator passing"> ✅ PASSING</span>
                        ) : (
                          <span className="score-indicator failing"> ❌ BELOW THRESHOLD</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="metrics-large">
                  <div className="metric-card">
                    <span className="metric-label">Average Score</span>
                    <span className="metric-big">
                      {selectedProject.avg_score !== undefined ? selectedProject.avg_score : '--'}/100
                    </span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Total Tests</span>
                    <span className="metric-big">
                      {selectedProject.test_count !== undefined ? selectedProject.test_count : '--'}
                    </span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Last Test</span>
                    <span className="metric-small">
                      {formatTimestamp(selectedProject.last_test_time)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Test Configuration</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Test Mode
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="testMode"
                        value="llm"
                        checked={testMode === 'llm'}
                        onChange={() => setTestMode('llm')}
                      />
                      <span>LLM Jailbreak Test (default)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="testMode"
                        value="agent"
                        checked={testMode === 'agent'}
                        onChange={() => setTestMode('agent')}
                      />
                      <span>🤖 Agent Safety Test (NEW!)</span>
                    </label>
                  </div>
                </div>

                {testMode === 'agent' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                      Agent Endpoint
                    </label>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', border: agentEndpointType === 'mock' ? '2px solid #0066cc' : '1px solid #e0e0e0', borderRadius: '8px', background: agentEndpointType === 'mock' ? '#e7f3ff' : 'white' }}>
                        <input
                          type="radio"
                          name="agentEndpointType"
                          value="mock"
                          checked={agentEndpointType === 'mock'}
                          onChange={() => {
                            setAgentEndpointType('mock')
                            setAgentEndpoint('http://localhost:8000/api/mock-agent')
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>Mock Agent (Demo)</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>70% vulnerable - shows penalties</div>
                        </div>
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', border: agentEndpointType === 'custom' ? '2px solid #0066cc' : '1px solid #e0e0e0', borderRadius: '8px', background: agentEndpointType === 'custom' ? '#e7f3ff' : 'white' }}>
                        <input
                          type="radio"
                          name="agentEndpointType"
                          value="custom"
                          checked={agentEndpointType === 'custom'}
                          onChange={() => {
                            setAgentEndpointType('custom')
                            setAgentEndpoint('')
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>Custom Endpoint</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>Your own agent API</div>
                        </div>
                      </label>
                    </div>
                    
                    {agentEndpointType === 'custom' && (
                      <input
                        id="agent-endpoint"
                        type="text"
                        value={agentEndpoint}
                        onChange={(e) => setAgentEndpoint(e.target.value)}
                        placeholder="https://your-agent-api.com/v1/chat"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '0.95rem'
                        }}
                      />
                    )}
                    
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.75rem' }}>
                      {agentEndpointType === 'mock' 
                        ? '🎭 Mock agent will simulate unsafe tool calls (~70% exploit success rate) to demonstrate penalties'
                        : '🔌 Provide your agent API endpoint (OpenAI Assistant format)'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="btn-test-large"
                  onClick={() => {
                    setSelectedProject(null)
                    runSafetyTestRealtime(selectedProject.id)
                  }}
                  disabled={testRunning || !selectedProject.active}
                >
                  {testRunning ? 'RUNNING TEST...' : testMode === 'agent' ? 'RUN AGENT TEST' : 'RUN LLM TEST'}
                </button>
                <button
                  className="btn-withdraw"
                  disabled={
                    !selectedProject.reward_balance ||
                    selectedProject.reward_balance === 0 ||
                    withdrawInFlight ||
                    !VAULT_ADDRESS
                  }
                  onClick={() => void handleWithdrawClick(selectedProject)}
                >
                  {withdrawInFlight ? 'WITHDRAWING...' : 'WITHDRAW REWARDS'}
                </button>
              </div>
              {(pendingTxHash || lastWithdrawTx) && (
                <p className={`tx-status ${pendingTxHash ? 'pending' : 'success'}`}>
                  {pendingTxHash
                    ? `Pending tx: ${formatTxHash(pendingTxHash)}`
                    : `Last tx: ${lastWithdrawTx ? formatTxHash(lastWithdrawTx) : ''}`}
                </p>
              )}
              {!VAULT_ADDRESS && (
                <p className="config-warning">
                  Set <code>VITE_ARC_VAULT_ADDRESS</code> in <code>frontend/.env</code> to enable withdrawals.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content create-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Arc Safety Project</h2>
              <button className="close-btn" onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="info-banner">
                <strong>Wallet status:</strong>{' '}
                {walletConnected && walletAddress
                  ? `Connected as ${formatAddress(walletAddress)}`
                  : 'Connect your Arc wallet from the header before creating a project.'}
                <br />
                This action will approve USDC and call createProject() directly from your wallet.
              </div>

              <div className="form-group">
                <label htmlFor="project-name">Project Name (Optional)</label>
                <input
                  id="project-name"
                  name="projectName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My LLM Safety Project"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target-model">Target Model *</label>
                <input
                  id="target-model"
                  name="targetModel"
                  type="text"
                  value={formData.target_model}
                  onChange={(e) => setFormData({ ...formData, target_model: e.target.value })}
                  placeholder="gpt-4, claude-3, etc."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="min-score">Min Safety Score *</label>
                  <input
                    id="min-score"
                    name="minScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.min_score}
                    onChange={(e) => setFormData({ ...formData, min_score: parseInt(e.target.value) })}
                  />
                  <span className="hint">Threshold for passing (0-100)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="initial-deposit">Initial Deposit (USDC) *</label>
                  <input
                    id="initial-deposit"
                    name="initialDeposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_deposit}
                    onChange={(e) => setFormData({ ...formData, initial_deposit: e.target.value })}
                  />
                  <span className="hint">Escrow amount</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payout-rate">Payout Rate (%) *</label>
                  <input
                    id="payout-rate"
                    name="payoutRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.payout_rate_bps / 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      payout_rate_bps: Math.round(parseFloat(e.target.value) * 100)
                    })}
                  />
                  <span className="hint">Reward on pass (default 5%)</span>
                </div>

                <div className="form-group">
                  <label htmlFor="penalty-rate">Penalty Rate (%) *</label>
                  <input
                    id="penalty-rate"
                    name="penaltyRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.penalty_rate_bps / 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      penalty_rate_bps: Math.round(parseFloat(e.target.value) * 100)
                    })}
                  />
                  <span className="hint">Penalty on fail (default 5%)</span>
                </div>
              </div>

              {createStep && (
                <div className="info-banner" style={{ marginTop: '1rem', background: '#fff3cd', borderColor: '#ffc107', color: '#856404' }}>
                  {createStep}
                </div>
              )}

              <div className="form-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowCreateForm(false)}
                  disabled={creatingProject}
                >
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={() => void handleCreateProject()}
                  disabled={creatingProject || !formData.target_model || !walletConnected}
                >
                  {creatingProject ? createStep || 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Test Progress Modal */}
      {showTestProgress && (
        <div className="modal-overlay" onClick={() => testProgress.finalScore !== undefined && setShowTestProgress(false)}>
          <div className="modal-content test-progress-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{testMode === 'agent' ? '🤖 Agent Safety Test' : '🔒 LLM Jailbreak Test'}</h2>
              {testProgress.finalScore !== undefined && (
                <button className="close-btn" onClick={() => setShowTestProgress(false)}>×</button>
              )}
            </div>

            <div className="modal-body">
              {/* Progress Bar */}
              {testProgress.total > 0 && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="progress-text">
                    {testProgress.current}/{testProgress.total} tests complete
                  </p>
                </div>
              )}

              {/* Current Test */}
              {testProgress.currentTest && (
                <div className="current-test">
                  <h3>{testProgress.currentTest}</h3>
                  {!testProgress.finalScore && <div className="spinner">⏳</div>}
                </div>
              )}

              {/* Results List */}
              <div className="results-list">
                {testProgress.results.map((result, idx) => (
                  <div key={idx} className={`result-item ${result.safe ? 'safe' : 'unsafe'}`}>
                    <span className="result-icon">{result.safe ? '✅' : '❌'}</span>
                    <span className="result-title">{result.title}</span>
                    <span className="result-status">{result.safe ? 'BLOCKED' : 'BROKEN'}</span>
                    {testMode === 'agent' && result.tools && result.tools.length > 0 && (
                      <div className="result-details">
                        Tools called: {result.tools.join(', ')}
                      </div>
                    )}
                    {result.violations && result.violations.length > 0 && (
                      <div className="result-violations">
                        {result.violations.join('; ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Current Score */}
              {testProgress.results.length > 0 && (
                <div className="current-score-display">
                  <h3>Current Score</h3>
                  <div className="score-big">
                    {Math.round((testProgress.results.filter(r => r.safe).length / testProgress.results.length) * 100)}%
                  </div>
                  <p>
                    {testProgress.results.filter(r => r.safe).length} safe / {testProgress.results.length} total
                  </p>
                </div>
              )}

              {/* Final Result */}
              {testProgress.finalScore !== undefined && testProgress.finalTxHash && (
                <div className="final-result-banner">
                  <h3>✅ Test Complete!</h3>
                  <div className="final-score">
                    Final Score: <strong>{testProgress.finalScore}/100</strong>
                  </div>
                  <a 
                    href={`https://testnet.arcscan.app/tx/${testProgress.finalTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="arcscan-link"
                  >
                    View Transaction on ArcScan →
                  </a>
                  <button 
                    className="btn-close-final"
                    onClick={() => setShowTestProgress(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

