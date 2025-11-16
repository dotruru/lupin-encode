export {}

type EthereumRequestArguments = {
  method: string
  params?: unknown[] | Record<string, unknown>
}

type EthereumProvider = {
  request: (args: EthereumRequestArguments) => Promise<unknown>
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}


