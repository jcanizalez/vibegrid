import { useState, useEffect } from 'react'
import { useServer } from './lib/use-server'
import { ConnectPage } from './components/ConnectPage'
import { MobileLayout } from './components/MobileLayout'
import { PermissionBanner } from './components/PermissionBanner'

const STORAGE_KEY = 'vibegrid-server-url'

/**
 * Detect if the PWA is served by the VibeGrid server (same origin).
 * When served by the server, auto-connect without showing ConnectPage.
 * In dev mode (yarn dev:web on port 5173), show ConnectPage.
 */
function detectAutoUrl(): string | null {
  // Vite dev server runs on a known port — don't auto-connect
  if (location.hostname === 'localhost' && location.port === '5173') return null
  // Served by the VibeGrid server — auto-connect to same origin
  return location.origin
}

export function App() {
  const autoUrl = detectAutoUrl()

  const [serverUrl, setServerUrl] = useState<string | null>(() => {
    return autoUrl ?? localStorage.getItem(STORAGE_KEY)
  })

  const { connected, config, sessions, permissionRequests, client, error } = useServer(serverUrl)

  const handleConnect = (url: string) => {
    localStorage.setItem(STORAGE_KEY, url)
    setServerUrl(url)
  }

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY)
    setServerUrl(autoUrl) // Fall back to auto-URL if served by server
  }

  useEffect(() => {
    if (!serverUrl) return
  }, [serverUrl])

  // Show connect page only in dev mode when not auto-connected
  if (!serverUrl || (!connected && !autoUrl)) {
    return (
      <ConnectPage
        onConnect={handleConnect}
        connecting={!!serverUrl && !connected && !error}
        error={error}
        savedUrl={serverUrl}
        onClearUrl={handleDisconnect}
      />
    )
  }

  // Auto-connect: show loading while connecting
  if (!connected) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Connecting to server...</p>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-gray-300">
      {permissionRequests.length > 0 && client && (
        <PermissionBanner requests={permissionRequests} client={client} />
      )}
      <MobileLayout
        config={config}
        sessions={sessions}
        client={client}
        onDisconnect={handleDisconnect}
      />
    </div>
  )
}
